import type { Page } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  PREFIJO_ROL_E2E,
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
  crearPersona,
  darRolDePrueba,
} from './soporte/base'
import { capturar } from './soporte/recorrido'
import { literal, sql } from './soporte/sql'

// El proyecto de repuestos guiado por pasos (`docs/UX.md` › `/repuestos/[id]`): arriba, los pasos que salen del flujo de repuestos con su progreso en texto (y los
// hitos «Precio al cliente» y «Pago del cliente» donde el flujo los pide); en cada fila, el botón del siguiente; las pestañas fijas Ítems · Cotizaciones · Pagos · Compras con la hoja en la primera, a la
// vista; el panel del ítem sin acordeones. Mientras corre, el flujo de repuestos suma una salida «Comprado → Perdido» con nota obligatoria y un requisito
// **informativo** de pago en «Comprado» (no frena ningún mover ajeno); los dos se quitan al empezar y al terminar. La etiqueta no empieza con «E2E»: la limpieza de
// `repuestos-proyecto.spec.ts` borra esas (D12). Cada proyecto de Playwright usa la suya.
test.describe.configure({ mode: 'serial' })

const A = 'Alternador'
const B = 'Bomba de agua'
const C = 'Correa'
const ACCION_PERDIDO = 'E2E Dar por perdido'
const MARCA = 'e2e-proyecto-por-pasos'
const formato = (n: number) =>
  new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

let etiqueta = ''
let duena = ''
let sinCostos = ''
let proyecto = ''
const ids: Record<string, string> = {}
const fases: Record<string, string> = {}

const deLaFase = (nombre: string) =>
  `(select f.id from fases f join flujos fl on fl.id = f.flujo_id where fl.ambito = 'repuestos' and f.nombre = ${literal(nombre)})`

function quitarLoDelFlujo() {
  sql(`delete from fases_transiciones where accion = ${literal(ACCION_PERDIDO)}`)
  sql(`delete from fases_requisitos where notas = ${literal(MARCA)}`)
}

function limpiar() {
  if (etiqueta !== '') {
    sql(`delete from repuestos_proyectos where vehiculo_etiqueta = ${literal(etiqueta)}`)
  }
}

const paso = (page: Page, clave: string) => page.locator(`[data-paso="${clave}"]`)
const fila = (page: Page, nombre: string) =>
  page.locator(`[data-fila-de-item="${ids[nombre] ?? ''}"]`).filter({ visible: true })

test.beforeAll(async ({}, info) => {
  const nombre = info.project.name
  etiqueta = `Prueba pasos ${nombre}`
  limpiar()
  quitarLoDelFlujo()
  for (const f of ['Por cotizar', 'Comprado', 'En tránsito', 'Recibido', 'Perdido']) {
    fases[f] = sql(`select ${deLaFase(f)}`).trim()
  }
  sql(
    `insert into fases_transiciones (flujo_id, de_fase_id, a_fase_id, accion, nota_obligatoria)
     select f.flujo_id, f.id, ${deLaFase('Perdido')}, ${literal(ACCION_PERDIDO)}, true from fases f where f.id = ${deLaFase('Comprado')}`,
  )
  sql(
    `insert into fases_requisitos (fase_id, tipo, bloqueante, clave_dato, orden, notas)
     values (${deLaFase('Comprado')}, 'dato', false, 'proyecto.pago_cliente', 9, ${literal(MARCA)})`,
  )
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-pasos-${nombre}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Pía Pasos' })
  sinCostos = correoDePrueba(`sin-costos-pasos-${nombre}`)
  await crearPersona({
    email: sinCostos,
    contrasena: CONTRASENA,
    nombre: 'Sol Pasos',
    invitada: true,
  })
  await darRolDePrueba({
    email: sinCostos,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}Pasos sin costos ${nombre}`,
      clave: `e2e_pasos_sin_costos_${nombre}`,
    },
    permisos: ['repuestos.ver', 'repuestos.editar', 'repuestos.mover', 'repuestos.cotizar'],
  })
})

test.afterAll(async () => {
  limpiar()
  quitarLoDelFlujo()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

test('los pasos salen del flujo con su progreso; un hito lleva a su pestaña y Compras es una pestaña', async ({
  page,
}, info) => {
  await entrar(page, duena, { fresco: true })
  await page.goto('/repuestos?panel=nuevo-proyecto')
  const nuevo = page.getByRole('dialog', { name: 'Nuevo proyecto' })
  await nuevo.getByLabel('Vehículo', { exact: true }).fill(etiqueta)
  await nuevo.getByRole('button', { name: 'Crear proyecto' }).click()
  await expect(page).toHaveURL(/\/repuestos\/[0-9a-f-]{36}$/)
  proyecto = new URL(page.url()).pathname.split('/').pop() ?? ''
  // Sin ítems: los pasos sólo con su nombre.
  await expect(page.getByText('Agrega ítems para ver cuántos van en cada paso.')).toBeVisible()
  for (const nombre of [A, B, C]) {
    const nueva = page.getByLabel('Nuevo ítem: descripción')
    await nueva.fill(nombre)
    await nueva.press('Enter')
    await expect(page.getByLabel(`Descripción del ítem ${nombre}`)).toBeVisible()
    ids[nombre] = sql(
      `select id from repuestos_items where proyecto_id = '${proyecto}' and descripcion = ${literal(nombre)}`,
    ).trim()
  }
  // B con precio; C con precio y en «Comprado».
  sql(
    `update repuestos_items set precio_cliente = 50, moneda = 'USD' where id in ('${ids[B] ?? ''}', '${ids[C] ?? ''}')`,
  )
  sql(
    `update repuestos_items set fase_id = '${fases['Comprado'] ?? ''}', fase_desde = now() where id = '${ids[C] ?? ''}'`,
  )
  await page.reload()

  await expect(paso(page, fases['Por cotizar'] ?? '')).toContainText('3 de 3')
  await expect(paso(page, 'precio')).toContainText('Precio al cliente')
  await expect(paso(page, 'precio')).toContainText('2 de 3 con precio')
  await expect(
    paso(page, 'precio').getByRole('button', { name: /Abrir Cotizaciones$/ }),
  ).toBeVisible()
  await expect(paso(page, 'pago')).toContainText('0 de 3 · Sin registrar')
  await expect(paso(page, 'pago').getByRole('button', { name: /Abrir Pagos$/ })).toBeVisible()
  await expect(paso(page, fases['Comprado'] ?? '')).toContainText('1 de 3')
  await expect(paso(page, fases['Recibido'] ?? '')).toContainText('0 de 3')
  await expect(page.getByRole('tab', { name: 'Compras', exact: true })).toBeVisible()
  await expect(fila(page, C).getByRole('button', { name: `Despachar · ${C}` })).toBeVisible()
  await capturar(page, info, 'pasos')
})

test('el siguiente de un ítem sin precio abre Cotizaciones y lo enfoca', async ({ page }, info) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/repuestos/${proyecto}`)
  await fila(page, A)
    .getByRole('button', { name: `Nueva cotización · ${A}` })
    .click()
  await expect(page).toHaveURL(/[?&]pestana=cotizaciones/)
  const titulo = page.getByRole('heading', { name: 'Cotizaciones', level: 2 })
  await expect(titulo).toBeFocused()
  await expect(page.getByRole('tab', { name: 'Cotizaciones', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  // Ítems es otra pestaña: la hoja sigue montada pero no se ve.
  await expect(page.getByRole('region', { name: 'Ítems del proyecto' })).toBeHidden()
  await capturar(page, info, 'panel-abierto')
})

test('un ítem avanza con su siguiente: el panel abre con el destino ya elegido', async ({
  page,
}, info) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/repuestos/${proyecto}`)
  await capturar(page, info, 'fila-con-siguiente')
  await fila(page, B)
    .getByRole('button', { name: `Comprar · ${B}` })
    .click()
  const panel = page.getByRole('dialog', { name: 'Repuesto' })
  await expect(page).toHaveURL(new RegExp(`destino=${fases['Comprado'] ?? ''}`))
  await expect(panel.locator('[data-bloque-del-hueco]').first()).toHaveAttribute(
    'data-bloque-del-hueco',
    'que-falta',
  )
  await capturar(page, info, 'panel-del-item')
  // «Comprado» ya está abierto: se confirma sin elegirlo.
  await panel.getByRole('button', { name: 'Comprar', exact: true }).click()
  await expect(page.getByText(`${B} pasó a «Comprado».`)).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(panel).toBeHidden()
  await expect(fila(page, B).getByRole('button', { name: `Despachar · ${B}` })).toBeVisible()
  await expect(paso(page, fases['Comprado'] ?? '')).toContainText('2 de 3')
})

test('una salida con nota obligatoria: el ítem queda «Perdido», sin botón, y cuenta en su paso', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/repuestos/${proyecto}`)
  await page.getByRole('button', { name: `Abrir el panel del ítem ${C}` }).click()
  const panel = page.getByRole('dialog', { name: 'Repuesto' })
  await panel.getByRole('button', { name: 'Elegir el destino «Perdido»' }).click()
  await panel.getByLabel('Nota interna (obligatoria)').fill('Se rompió en el depósito.')
  await panel.getByRole('button', { name: ACCION_PERDIDO, exact: true }).click()
  await expect(page.getByText(`${C} pasó a «Perdido».`)).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(panel).toBeHidden()
  // La fila no repite la fase: queda bajo el encabezado del grupo de «Perdido».
  await expect(
    page
      .locator(`[data-grupo-de-paso="${fases['Perdido'] ?? ''}"]`)
      .filter({ visible: true })
      .locator(`[data-fila-de-item="${ids[C] ?? ''}"]`),
  ).toBeVisible()
  await expect(fila(page, C).locator('[data-siguiente-item]')).toHaveCount(0)
  await expect(paso(page, fases['Perdido'] ?? '')).toContainText('1 de 3')
  await expect(paso(page, fases['Recibido'] ?? '')).toContainText('0 de 3')
})

test('registrar un pago desde su paso: el hito pasa a «Registrado»', async ({ page }) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/repuestos/${proyecto}`)
  await paso(page, 'pago')
    .getByRole('button', { name: /Abrir Pagos$/ })
    .click()
  await expect(page).toHaveURL(/[?&]pestana=pagos/)
  await page.getByRole('button', { name: 'Registrar pago', exact: true }).click()
  const formulario = page.getByRole('dialog', { name: 'Registrar pago' })
  await formulario.getByLabel('Concepto').fill('Anticipo de los repuestos')
  await formulario.getByLabel('Monto').fill(formato(120))
  await formulario.getByRole('button', { name: 'Registrar pago' }).click()
  await expect(formulario).toBeHidden()
  await expect(paso(page, 'pago')).toContainText('3 de 3 · Registrado')
})

test('?pestana=compras abre la pestaña Compras; el enlace viejo de una compra redirige', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/repuestos/${proyecto}?pestana=compras`)
  await expect(page.getByRole('tab', { name: 'Compras', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await expect(page.getByRole('region', { name: 'Margen del proyecto' })).toBeVisible()
  await page.goto(`/repuestos/${proyecto}?panel=compra&compra=nueva`)
  await expect(page).toHaveURL(/[?&]pestana=compras/)
  await expect(page.getByRole('dialog', { name: 'Registrar compra' })).toBeVisible()
})

test('las pestañas no se mueven al cambiar de una a otra y la hoja vuelve como estaba', async ({
  page,
}, info) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/repuestos/${proyecto}`)
  const pestanas = page.getByRole('tablist')
  const hoja = page.getByRole('region', { name: 'Ítems del proyecto' })
  await expect(page.getByRole('tab', { name: 'Ítems', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await expect(hoja).toBeVisible()
  const antes = await pestanas.boundingBox()
  for (const titulo of ['Cotizaciones', 'Pagos', 'Compras']) {
    await page.getByRole('tab', { name: titulo, exact: true }).click()
    await expect(page.getByRole('tab', { name: titulo, exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await expect(page).toHaveURL(new RegExp(`[?&]pestana=${titulo.toLowerCase()}`))
    await expect(hoja).toBeHidden()
    expect(await pestanas.boundingBox()).toEqual(antes)
  }
  await capturar(page, info, 'pestana-compras')
  await page.getByRole('tab', { name: 'Ítems', exact: true }).click()
  await expect(page).not.toHaveURL(/pestana=/)
  await expect(hoja).toBeVisible()
  await expect(page.getByLabel(`Descripción del ítem ${A}`)).toBeVisible()
  expect(await pestanas.boundingBox()).toEqual(antes)
  // Un enlace con `?pestana=items` abre lo mismo que sin ella.
  await page.goto(`/repuestos/${proyecto}?pestana=items`)
  await expect(hoja).toBeVisible()
})

test('el panel del ítem va sin acordeones, con «Qué falta» primero', async ({ page }) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/repuestos/${proyecto}?item=${ids[A] ?? ''}`)
  const panel = page.getByRole('dialog', { name: 'Repuesto' })
  await expect(panel.getByRole('heading', { name: A })).toBeVisible()
  await expect(panel.locator('details')).toHaveCount(0)
  const orden = await panel
    .locator('[data-bloque-del-hueco]')
    .evaluateAll((secciones) => secciones.map((s) => s.getAttribute('data-bloque-del-hueco')))
  expect(orden.slice(0, 7)).toEqual([
    'que-falta',
    'imagenes',
    'stock',
    'compras',
    'documentos',
    'historial',
    'notas',
  ])
  await expect(panel.getByText('Este ítem no tiene compras registradas.')).toBeVisible()
  await expect(panel.getByText('Nada en stock.')).toBeVisible()
})

test('sin `repuestos.costos.ver` no aparece nada de costos', async ({ page }) => {
  await entrar(page, sinCostos, { fresco: true })
  await page.goto(`/repuestos/${proyecto}?pestana=compras`)
  await expect(page.getByLabel(`Descripción del ítem ${A}`)).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Pagos', exact: true })).toHaveCount(0)
  await expect(page.getByRole('tab', { name: 'Compras', exact: true })).toHaveCount(0)
  await expect(page.getByRole('region', { name: 'Margen del proyecto' })).toHaveCount(0)
  await expect(page.getByRole('list', { name: 'Compras del proyecto' })).toHaveCount(0)
  await expect(paso(page, 'pago')).toBeVisible()
  await expect(paso(page, 'pago')).not.toContainText('Registrado')
  await expect(paso(page, 'pago')).not.toContainText('Sin registrar')
  await page.goto(`/repuestos/${proyecto}?item=${ids[A] ?? ''}`)
  const panel = page.getByRole('dialog', { name: 'Repuesto' })
  await expect(panel.locator('[data-bloque-del-hueco="stock"]')).toBeVisible()
  await expect(panel.locator('[data-bloque-del-hueco="compras"]')).toHaveCount(0)
})
