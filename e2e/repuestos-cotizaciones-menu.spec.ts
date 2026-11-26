import type { Page } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import { borrarPersonasDePrueba, correoDePrueba, crearDuenaDePrueba } from './soporte/base'
import { literal, sql } from './soporte/sql'
import { formatearMonto } from '../src/shared/lib/formato'

// Las cotizaciones de un proyecto se manejan desde su tarjeta y su hoja se entiende sin saltos: el «⋯» de cada tarjeta (una borrador con total: Abrir, Aceptar y
// Anular; una sin total: «Aceptar» apagado con su motivo; una anulada: sólo Abrir), tocar la tarjeta abre la hoja, aceptar desde el «⋯» con su confirmación (la URL lleva la
// cotización) y, en la hoja, el cliente, el estado y el total arriba; editar celdas y recalcular no mueve los bloques ni el total de arriba (`boundingBox()` antes y después).
// La etiqueta no empieza con «E2E»: la limpieza de `repuestos-proyecto.spec.ts` borra esas. Borrar el proyecto borra sus cotizaciones y líneas en cascada.
test.describe.configure({ mode: 'serial' })

const BASE = 'USD'
const monto = (valor: number) => formatearMonto(valor, { moneda: BASE, locale: 'es-BO' })
const CLIENTE = 'Taller Menú Prueba'

let etiqueta = ''
let duena = ''
let proyecto = ''
const limpiar = () => {
  if (etiqueta !== '') {
    sql(`delete from repuestos_proyectos where vehiculo_etiqueta = ${literal(etiqueta)}`)
  }
}

test.beforeAll(async ({}, info) => {
  etiqueta = `Prueba cotizaciones menu e2e ${info.project.name}`
  limpiar()
  await borrarPersonasDePrueba()
  duena = correoDePrueba(`duena-cotizaciones-menu-${info.project.name}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Rita Menú' })
  sql(`
    insert into repuestos_cotizador_config (factor_importado, recargo_local, redondeo, creado_por)
      select 1.3500, 0.1000, 1.00, id from auth.users where email = ${literal(duena)}`)
  proyecto = sql(`
    insert into repuestos_proyectos (vehiculo_etiqueta, cliente_nombre)
      values (${literal(etiqueta)}, ${literal(CLIENTE)}) returning id`)
})

test.afterAll(async () => {
  limpiar()
  await borrarPersonasDePrueba()
})

const ids: string[] = []
const numeros: number[] = []

test('tres cotizaciones: con total, sin total y anulada', async ({ page }) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/repuestos/${proyecto}?pestana=cotizaciones`)
  for (let i = 0; i < 3; i += 1) {
    await page.getByRole('button', { name: 'Nueva cotización', exact: true }).click()
    await expect(page).toHaveURL(/\/cotizaciones\/[0-9a-f-]{36}$/)
    ids.push(new URL(page.url()).pathname.split('/').pop() ?? '')
    const titulo = page.getByRole('heading', { level: 1, name: /^Cotización #\d+$/ })
    numeros.push(Number((await titulo.textContent())?.replace(/\D/g, '')))
    await page.getByRole('link', { name: 'Volver al proyecto' }).click()
    await expect(page.getByRole('list', { name: 'Cotizaciones del proyecto' })).toBeVisible()
  }
  const [conTotal, , anulada] = ids
  sql(`
    insert into repuestos_cotizaciones_lineas (cotizacion_id, descripcion, bloque, cantidad, costo, logistica_sugerida, caja, total, orden)
      values (${literal(conTotal ?? '')}, 'Filtro importado', 'importado', 1, 80, 15, 10, 133, 0);
    update repuestos_cotizaciones set total = 133 where id = ${literal(conTotal ?? '')};
    update repuestos_cotizaciones set estado = 'anulada' where id = ${literal(anulada ?? '')}`)
})

function tarjetaDe(page: Page, i: number) {
  return page
    .getByRole('list', { name: 'Cotizaciones del proyecto' })
    .getByRole('listitem')
    .filter({ hasText: new RegExp(`Cotización #${String(numeros[i])}(?!\\d)`) })
}

const masAcciones = (page: Page, i: number) =>
  page.getByRole('button', { name: `Más acciones de Cotización #${String(numeros[i])}` })

test('el «⋯» de cada tarjeta ofrece lo que la cotización permite', async ({ page }) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/repuestos/${proyecto}?pestana=cotizaciones`)

  // Borrador con total: Abrir, Aceptar y Anular.
  await masAcciones(page, 0).click()
  await expect(page.getByRole('menuitem', { name: 'Abrir' })).toBeVisible()
  await expect(page.getByRole('menuitem', { name: 'Aceptar' })).toBeEnabled()
  await expect(page.getByRole('menuitem', { name: 'Anular' })).toBeEnabled()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menu')).toHaveCount(0)

  // Borrador sin total: «Aceptar» apagado con su motivo.
  await masAcciones(page, 1).click()
  await expect(page.getByRole('menuitem', { name: 'Aceptar' })).toBeDisabled()
  await expect(page.getByText('Para aceptarla, cada línea necesita su total.')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menu')).toHaveCount(0)

  // Anulada: sólo Abrir.
  await masAcciones(page, 2).click()
  await expect(page.getByRole('menuitem', { name: 'Abrir' })).toBeVisible()
  await expect(page.getByRole('menuitem', { name: 'Aceptar' })).toHaveCount(0)
  await expect(page.getByRole('menuitem', { name: 'Anular' })).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menu')).toHaveCount(0)

  // Las tres tarjetas miden lo mismo.
  const alturas = await Promise.all(
    [0, 1, 2].map(async (i) => (await tarjetaDe(page, i).boundingBox())?.height),
  )
  expect(new Set(alturas).size).toBe(1)
})

test('tocar la tarjeta abre la hoja de la cotización', async ({ page }) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/repuestos/${proyecto}?pestana=cotizaciones`)
  await tarjetaDe(page, 1)
    .getByText(/^Creada el/)
    .click()
  await expect(page).toHaveURL(new RegExp(`/cotizaciones/${ids[1] ?? ''}$`))
})

test('aceptar desde el «⋯» pide su confirmación con la cotización en la URL', async ({ page }) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/repuestos/${proyecto}?pestana=cotizaciones`)
  await masAcciones(page, 0).click()
  await page.getByRole('menuitem', { name: 'Aceptar' }).click()
  await expect(page).toHaveURL(/[?&]panel=aceptar-cotizacion/)
  await expect(page).toHaveURL(new RegExp(`[?&]cotizacion=${ids[0] ?? ''}`))
  const dialogo = page.getByRole('dialog', { name: `Aceptar la cotización #${String(numeros[0])}` })
  await expect(dialogo).toContainText(monto(133))
  await dialogo.getByRole('button', { name: 'Aceptar cotización' }).click()
  await expect(dialogo).toBeHidden()
  await expect(tarjetaDe(page, 0)).toContainText('Aceptada')
  await expect(page).not.toHaveURL(/panel=aceptar-cotizacion/)
  expect(sql(`select estado from repuestos_cotizaciones where id = ${literal(ids[0] ?? '')}`)).toBe(
    'aceptada',
  )
  // Aceptada: sólo Abrir y Anular.
  await masAcciones(page, 0).click()
  await expect(page.getByRole('menuitem', { name: 'Anular' })).toBeVisible()
  await expect(page.getByRole('menuitem', { name: 'Aceptar' })).toHaveCount(0)
})

test('en la hoja: el cliente, el estado y el total arriba; editar no mueve nada', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/repuestos/${proyecto}/cotizaciones/${ids[1] ?? ''}`)
  await expect(
    page.getByRole('heading', { level: 1, name: `Cotización #${String(numeros[1])}` }),
  ).toBeVisible()
  await expect(page.getByText('Borrador', { exact: true })).toBeVisible()
  await expect(page.getByText(CLIENTE)).toBeVisible()
  const total = page.locator('[data-total-de-la-cotizacion]')
  await expect(total).toContainText('Sin total')

  const local = page.getByRole('region', { name: 'Local' })
  await local.getByRole('button', { name: 'Agregar línea' }).click()
  const linea = local.getByRole('listitem', { name: 'Línea 1 de Local' })
  await expect(linea).toBeVisible()
  const condiciones = page.getByRole('region', { name: 'Condiciones' })
  // `boundingBox()` es del viewport: el foco de una celda desplaza la página, así que se suma el desplazamiento (la posición en la página).
  const caja = async (l: typeof total) => {
    const [b, desplazado] = await Promise.all([
      l.boundingBox(),
      page.evaluate(() => window.scrollY),
    ])
    return { y: (b?.y ?? 0) + desplazado, height: b?.height ?? 0, width: b?.width ?? 0 }
  }
  const medir = async () => ({
    local: await caja(local),
    condiciones: await caja(condiciones),
    total: await caja(total),
    linea: await caja(linea),
  })
  const antes = await medir()

  const tipear = async (nombre: string, valor: string) => {
    const celda = linea.getByRole('group', { name: nombre })
    await celda.locator('[data-parada="0"]').focus()
    await page.keyboard.type(valor)
    await page.keyboard.press('Enter')
  }
  await linea.getByLabel('Descripción').fill('Aceite local')
  await tipear('Costo', '90')
  await tipear('Logística', '10')
  await linea.getByLabel('Caja', { exact: true }).selectOption('0.00')
  await expect(total).toContainText(monto(110))
  await expect(linea).toContainText(monto(110))
  await condiciones.scrollIntoViewIfNeeded()
  const despues = await medir()

  // Calcular el total, elegir caja y escribir no mueven los bloques, el pie ni el total de arriba.
  for (const k of ['local', 'condiciones', 'total', 'linea'] as const) {
    expect(despues[k].y, k).toBeCloseTo(antes[k].y, 0)
    expect(despues[k].height, k).toBe(antes[k].height)
  }
  expect(despues.total.width).toBeGreaterThanOrEqual(antes.total.width)
  await expect(page.getByText('Cambios sin guardar')).toBeVisible()
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByText('Cambios sin guardar')).toHaveCount(0)
  expect(
    sql(`select total::text from repuestos_cotizaciones where id = ${literal(ids[1] ?? '')}`),
  ).toBe('110.00')
})
