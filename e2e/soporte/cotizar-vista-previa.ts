// Lo que comparten los e2e de «Vista previa» de la tarjeta (paso 4.18-2): los lugares del modal y sus gestos. Sólo para las pruebas.
import { cabeceraDeLaGuardada, elegirEnElMenu } from './menu-de-la-guardada'
import { expect, type Locator, type Page, type TestInfo } from '@playwright/test'
import { entrar } from './alta'
import { esperarElTotal, regionDelTotal, tipearEnLaHoja } from './cotizar-guardar'
import { sql } from './sql'

export const zona = () => sql('select zona_horaria from public.ajustes_empresa')
export const hoja = (page: Page) => page.locator('[data-hoja]')
export { regionDelTotal }
export const dialogo = (page: Page) => page.getByRole('dialog', { name: 'Vista previa' })
export const tarjeta = (page: Page) =>
  dialogo(page).getByRole('group', { name: 'Tarjeta de la cotización' })
export const total = (t: Locator) => t.locator('[data-total-usd]')
// Lo que muestra una variable de la cotización en la tarjeta (`fecha_larga`, `asesor_nombre`…).
export const variable = (t: Locator, clave: string) => t.locator(`[data-variable="${clave}"]`)
// El título de cada grupo y su color, en el orden dibujado: la celda de la columna del grupo en la primera fila de cada uno.
export const grupos = (t: Locator) =>
  t
    .locator('[data-fila^="n_"][data-columna="grupo"]')
    .evaluateAll((es) => es.map((e) => [e.textContent.trim(), e.getAttribute('data-color')]))
// El concepto de cada fila de un grupo y la etiqueta de cada «aparte», en el orden dibujado (sin la leyenda ni el monto).
export const etiquetasDeLasFilas = (t: Locator) =>
  t
    .locator(
      '[data-fila^="n_"][data-columna="concepto"], [data-fila^="a_"]:not([data-columna="monto"])',
    )
    .evaluateAll((es) => es.map((e) => e.textContent.trim()))

// Cuánto se aparta una celda combinada de cubrir desde la primera hasta la última de unas celdas (en px, arriba y abajo).
export async function desvioDeLaCombinada(celda: Locator, desde: Locator, hasta: Locator) {
  const [c, d, h] = await Promise.all([
    celda.boundingBox(),
    desde.boundingBox(),
    hasta.boundingBox(),
  ])
  if (!c || !d || !h) throw new Error('Falta una caja de la tarjeta.')
  return { arriba: Math.abs(c.y - d.y), abajo: Math.abs(c.y + c.height - h.y - h.height) }
}

export const textoDe = async (l: Locator) => ((await l.textContent()) ?? '').replace(/\s/g, '')

// Otra persona entra en la misma página: la sesión de la anterior se va (con ella puesta, `/ingreso` no muestra el formulario).
export async function abrirLaHoja(page: Page, quien: string, url: string) {
  await page.context().clearCookies()
  await entrar(page, quien, { fresco: true })
  await page.goto(url)
  await expect(hoja(page)).toBeVisible()
}

// Espera a que el total esté al día (la hoja recalcula 150 ms después de la última confirmación).
export const alDia = (page: Page) => esperarElTotal(page)

// En la hoja nueva, el paso «Vista previa» de los pasos de la hoja; en una guardada, la línea del «⋯» de su cabecera.
export async function abrirLaVistaPrevia(page: Page): Promise<Locator> {
  if ((await cabeceraDeLaGuardada(page).count()) > 0) {
    await elegirEnElMenu(page, 'Vista previa')
  } else {
    await page.locator('[data-paso="vista_previa"]').click()
  }
  await expect(dialogo(page)).toBeVisible()
  await expect(tarjeta(page)).toBeVisible()
  return tarjeta(page)
}

export async function cerrarLaVistaPrevia(page: Page) {
  await page.keyboard.press('Escape')
  await expect(dialogo(page)).toBeHidden()
}

// La hoja de la subasta de la semilla con un lead y un vehículo de prueba.
export const urlDeLaSubasta = (subasta: string, lead: string, vehiculo: string) =>
  `/cotizaciones/nuevo?origen=${subasta}&lead=${lead}&vehiculo=${vehiculo}`

// Entra, abre la hoja y le pone el remate de 9.500: lo que pide una tarjeta con números.
export async function cotizarEnLaSubasta(page: Page, quien: string, url: string) {
  await abrirLaHoja(page, quien, url)
  await tipearEnLaHoja(page, 'remate', '9500')
  await alDia(page)
}

// Lo medido va al reporte de la corrida (`test.info().annotations`).
export function anotar(info: TestInfo, tipo: string, valor: number): void {
  info.annotations.push({ type: tipo, description: String(valor) })
  console.warn(`[medido] ${tipo}: ${String(valor)}`)
}
