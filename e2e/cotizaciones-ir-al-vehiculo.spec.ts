import { expect, test, type Locator, type Page } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { borrarRolesDePrueba } from './soporte/base'
import { limpiarGuardado } from './soporte/cotizar-guardar'
import { esMovil } from './soporte/inventario'
import {
  TITULO_UNO,
  prepararListado,
  type TerrenoDelListado,
} from './soporte/listado-de-cotizaciones'
import { literal, sql } from './soporte/sql'

// Desde una cotización se llega al vehículo con un toque (T566): el título del resumen y de la tarjeta de la lista y la celda «Vehículo» de la tabla enlazan a `/vehiculos/<id>`
// (sin `vehiculos.ver` del origen, texto); en el panel del vehículo de la hoja, cada tarjeta lleva un enlace propio que abre la ficha en otra pestaña sin elegir ni cerrar.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelListado

test.beforeAll(async ({}, info) => {
  t = await prepararListado(info.project.name)
  sql(
    `update public.vehiculos set cotizado_en = now() where id in (${literal(t.vehiculos.uno)}::uuid, ${literal(t.vehiculos.dos)}::uuid)`,
  )
})

test.afterAll(async () => {
  sql(
    `delete from public.vistos where modulo = 'cotizaciones' and referencia_id in (select id from public.cotizaciones where origen_id = ${literal(t.origen.id)}::uuid)`,
  )
  await limpiarGuardado()
  await borrarRolesDePrueba()
})

const filas = (page: Page): Locator =>
  page.locator('tbody tr, li article').filter({ visible: true })
const enElOrigen = (vista: 'tabla' | 'tarjetas'): string =>
  `/cotizaciones?origen=${t.origen.id}&vista=${vista}&agrupar=no`
const deUno = (): string =>
  sql(
    `select id from public.cotizaciones where vehiculo_id = ${literal(t.vehiculos.uno)}::uuid and lead_id = ${literal(t.leads.duena)}::uuid order by creado_en desc, id desc limit 1`,
  )

const hrefDelUno = (): string => `/vehiculos/${t.vehiculos.uno}`

test('V1 el título del resumen y el dato «Vehículo» enlazan a la ficha y navegan en la misma pestaña', async ({
  page,
}) => {
  await entrar(page, t.duena, { fresco: true })
  await page.goto(`${enElOrigen('tabla')}&cotizacion=${deUno()}`)
  const resumen = page.getByRole('dialog')
  const enlace = resumen.locator('[data-titulo-de-la-cotizacion] a')
  await expect(enlace).toBeVisible()
  await expect(enlace).toHaveAttribute('href', hrefDelUno())
  await expect(enlace).not.toHaveAttribute('target', /.+/)
  await expect(enlace).toHaveAccessibleName(/^Ver .+ en Vehículos$/)
  await expect(resumen.getByRole('link', { name: TITULO_UNO, exact: true })).toHaveAttribute(
    'href',
    hrefDelUno(),
  )
  await enlace.click()
  await expect(page).toHaveURL(new RegExp(`/vehiculos/${t.vehiculos.uno}$`))
})

test('V2 sin vehiculos.ver del origen, el título y el dato son texto', async ({ page }) => {
  await entrar(page, t.soloVer, { fresco: true })
  await page.goto(`${enElOrigen('tabla')}&cotizacion=${deUno()}`)
  const resumen = page.getByRole('dialog')
  await expect(resumen.locator('[data-titulo-de-la-cotizacion]')).toBeVisible()
  await expect(resumen.getByRole('link', { name: /en Vehículos/ })).toHaveCount(0)
  await expect(resumen.locator('[data-titulo-de-la-cotizacion] a')).toHaveCount(0)
})

test('V3 en la lista, el enlace del vehículo navega y tocar el resto de la tarjeta o la fila abre el resumen', async ({
  page,
}) => {
  await entrar(page, t.duena, { fresco: true })
  const vista = esMovil(page) ? 'tarjetas' : 'tabla'
  await page.goto(enElOrigen(vista))
  await expect(filas(page).first()).toBeVisible()
  const alVehiculo = page.locator(`a[href="${hrefDelUno()}"]`)
  const fila = filas(page).filter({ has: alVehiculo }).first()
  const enlace = fila.locator(`a[href="${hrefDelUno()}"]`).first()
  await expect(enlace).toHaveAttribute('href', hrefDelUno())
  // Tocar la fila (no el enlace) abre el resumen.
  await (
    esMovil(page) ? fila.locator('[data-autor-de-la-cotizacion]') : fila.getByRole('cell').nth(2)
  ).click()
  await expect(page).toHaveURL(/cotizacion=[0-9a-f-]{36}/)
  await page.getByRole('dialog').getByRole('button', { name: 'Cerrar' }).first().click()
  await expect(page).not.toHaveURL(/cotizacion=/)
  await enlace.click()
  await expect(page).toHaveURL(new RegExp(`/vehiculos/${t.vehiculos.uno}$`))
  await expect(page).not.toHaveURL(/cotizacion=/)
})

test('V4 en el panel de la hoja, el botón abre la ficha en otra pestaña sin elegir ni cerrar el panel', async ({
  page,
  context,
}) => {
  await entrar(page, t.duena, { fresco: true })
  await page.goto(`/cotizaciones/nuevo?origen=${t.origen.id}&lead=${t.leads.duena}`)
  await expect(page.locator('[data-hoja]')).toBeVisible()
  await page.getByRole('button', { name: /^Vehículo:/ }).click()
  const panel = page.getByRole('dialog', { name: 'Vehículo' })
  const boton = panel.getByRole('link', { name: `Ver ${TITULO_UNO} en Vehículos` })
  await expect(boton).toBeVisible()
  await expect(boton).toHaveAttribute('target', '_blank')
  await expect(boton).toHaveAttribute('href', hrefDelUno())
  if (esMovil(page)) {
    const caja = await boton.boundingBox()
    expect(caja?.width ?? 0).toBeGreaterThanOrEqual(44)
    expect(caja?.height ?? 0).toBeGreaterThanOrEqual(44)
  }
  const [otra] = await Promise.all([context.waitForEvent('page'), boton.click()])
  await otra.waitForLoadState('domcontentloaded')
  expect(new URL(otra.url()).pathname).toBe(hrefDelUno())
  await otra.close()
  // La hoja quedó intacta: el panel sigue abierto y no se eligió nada.
  await expect(panel).toBeVisible()
  await expect(page).toHaveURL(/panel=vehiculo/)
  await expect(page).not.toHaveURL(/vehiculo=[0-9a-f-]{36}/)
})
