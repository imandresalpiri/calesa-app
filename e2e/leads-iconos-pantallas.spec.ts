import type { Locator } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import {
  limpiarRecorrido,
  prepararRecorrido,
  sinScrollHorizontal,
  capturar,
  type TerrenoDelRecorrido,
} from './soporte/recorrido'
import { sql } from './soporte/sql'

// Los iconos del catálogo, dibujados donde se muestra el nombre (Configuración de leads): el origen y el tipo del lead en el listado (la fila y la
// tarjeta), en la ficha (la cabecera y «Datos») y en el resumen del drawer; el tipo de un seguimiento en la línea de tiempo (ficha y resumen). Un
// icono nunca va solo: el nombre al lado lo dice. Sin icono no se dibuja nada, y una clave que el catálogo no conoce se dibuja neutra sin romper.
test.describe.configure({ mode: 'serial' })

let r: TerrenoDelRecorrido
const ORIGEN = "(select id from public.origenes_lead where clave = 'facebook')"
const TIPO_DE_LEAD = "(select id from public.tipos_lead where clave = 'prospecto')"

test.beforeAll(async ({}, info) => {
  r = await prepararRecorrido(info.project.name, 'Iconos')
  sql(`
    update public.origenes_lead set icono = 'compartir' where clave = 'facebook';
    update public.tipos_lead set icono = 'persona' where clave = 'prospecto';
    update public.tipos_seguimiento set icono = 'telefono' where clave = 'llamada';
    update public.leads set origen_lead_id = ${ORIGEN}, tipo_lead_id = ${TIPO_DE_LEAD} where id = '${r.uno.id}';
    insert into public.seguimientos (lead_id, usuario_id, tipo_id, titulo, visibilidad)
      select '${r.uno.id}', (select id from public.perfiles order by creado_en limit 1),
             (select id from public.tipos_seguimiento where clave = 'llamada'), 'Llamada de los iconos', 'publico';
  `)
})

test.afterAll(async () => {
  sql(`
    update public.origenes_lead set icono = 'compartir' where clave = 'facebook';
    update public.tipos_seguimiento set activo = true, icono = 'telefono' where clave = 'llamada';
  `)
  await limpiarRecorrido(r)
})

const conUnIcono = (lugar: Locator, clave: string) =>
  expect(lugar.locator(`svg[data-icono="${clave}"]`).first()).toBeVisible()

test('el listado dibuja el icono del origen y el del tipo junto a sus nombres, también en la tarjeta del celular', async ({
  page,
}, info) => {
  await entrar(page, r.t.personas.duena)
  await page.goto(`/leads?alcance=todos&q=${encodeURIComponent(r.uno.nombre)}`)
  const fila = page.locator('tr, article').filter({ hasText: r.uno.nombre }).first()
  await expect(fila).toBeVisible()
  await conUnIcono(fila, 'compartir')
  await conUnIcono(fila, 'persona')
  // El icono acompaña al nombre: el nombre sigue a la vista.
  await expect(fila.getByText('Facebook')).toBeVisible()
  await expect(fila.getByText('Prospecto')).toBeVisible()
  await sinScrollHorizontal(page)
  await capturar(page, info, 'iconos-listado')
})

test('la ficha dibuja los dos en «Datos», y el tipo del seguimiento en la línea de tiempo', async ({
  page,
}, info) => {
  await entrar(page, r.t.personas.duena)
  await page.goto(`/leads/${r.uno.id}`)
  const datos = page.locator('dl').filter({ hasText: 'Origen del lead' }).first()
  await conUnIcono(datos, 'compartir')
  await conUnIcono(datos, 'persona')
  await capturar(page, info, 'iconos-ficha')
  await page.goto(`/leads/${r.uno.id}?seccion=seguimientos`)
  const nota = page.getByRole('article', { name: 'Llamada de los iconos' })
  await expect(nota).toBeVisible()
  await expect(nota.getByText('Llamada', { exact: true })).toBeVisible()
  await conUnIcono(nota, 'telefono')
  await capturar(page, info, 'iconos-ficha-seguimientos')
})

test('sin icono no se dibuja nada; una clave desconocida se dibuja neutra y nada se rompe; un tipo apagado sigue nombrando y con su icono', async ({
  page,
}) => {
  sql(`
    update public.origenes_lead set icono = null where clave = 'facebook';
    update public.tipos_lead set icono = 'marciano' where clave = 'prospecto';
    update public.tipos_seguimiento set activo = false where clave = 'llamada';
  `)
  await entrar(page, r.t.personas.duena)
  await page.goto(`/leads/${r.uno.id}`)
  const datos = page.locator('dl').filter({ hasText: 'Origen del lead' }).first()
  await expect(datos.getByText('Facebook')).toBeVisible()
  await expect(datos.locator('svg[data-icono="compartir"]')).toHaveCount(0)
  await expect(datos.locator('svg[data-icono="desconocido"]')).toHaveCount(1)
  await expect(datos.getByText('Prospecto')).toBeVisible()
  await page.goto(`/leads/${r.uno.id}?seccion=seguimientos`)
  const nota = page.getByRole('article', { name: 'Llamada de los iconos' })
  await expect(nota.getByText('Llamada', { exact: true })).toBeVisible()
  await conUnIcono(nota, 'telefono')
  // Lo que se deja como estaba.
  sql(`
    update public.origenes_lead set icono = 'compartir' where clave = 'facebook';
    update public.tipos_lead set icono = 'persona' where clave = 'prospecto';
    update public.tipos_seguimiento set activo = true where clave = 'llamada';
  `)
})
