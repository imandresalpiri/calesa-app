// La planilla de la fórmula como hoja de cálculo (`docs/UX.md` › «Cotización: fórmula (estados propios)»): la grilla A1 (`role="grid"`), la barra de fórmula, el
// «⋯» de la fila activa y el arrastre por el número de fila. Las celdas se buscan por la fila (`data-fila`, el id del nodo) y la columna: el número de una fila
// cambia al insertar o mover, y la fórmula de prueba suma las suyas antes. `a1De()` lee el nombre que tiene ahora («C7»).
import { expect, type Locator, type Page } from '@playwright/test'
import { barraDeLaFormula } from './barra-de-la-formula'
import { enLaPestana } from './pestanas-del-origen'
import { abrirLaFormula } from './rutas-de-la-formula'
import { literal, sql } from './sql'

export type ColumnaDeLaPlanilla = 'A' | 'B' | 'C' | 'D'

export const planilla = (page: Page) => page.getByRole('region', { name: 'Planilla de la fórmula' })
export const grilla = (page: Page) => planilla(page).getByRole('grid')
export const barra = (page: Page) =>
  planilla(page).getByRole('region', { name: 'Barra de fórmula' })
// El texto de la barra: `Fórmula de C7, Comisión`.
export const textoDeLaBarra = (page: Page) => barra(page).getByRole('textbox')
export const filaDe = (page: Page, id: string) => grilla(page).locator(`tr[data-fila="${id}"]`)
export const celdaDe = (page: Page, id: string, col: ColumnaDeLaPlanilla = 'C') =>
  filaDe(page, id).locator(`[data-col="${col}"]`)
export const celda = (page: Page, a1: string) => grilla(page).locator(`[data-celda="${a1}"]`)
// La entrada de la celda que se escribe (una sola en la grilla).
export const entradaDeLaCelda = (page: Page) => grilla(page).getByRole('combobox')
export const sugerencias = (page: Page) =>
  planilla(page).getByRole('listbox', { name: 'Sugerencias' })
export const guardado = (page: Page) => planilla(page).locator('[data-guardado] [role="status"]')
// «Guardar el borrador» va en la barra de la fórmula, arriba de la planilla.
export const guardar = (page: Page) =>
  barraDeLaFormula(page).getByRole('button', { name: 'Guardar el borrador', exact: true })

// El nombre A1 de la celda de esa fila hoy («C7»).
export async function a1De(
  page: Page,
  id: string,
  col: ColumnaDeLaPlanilla = 'C',
): Promise<string> {
  const nombre = await celdaDe(page, id, col).getAttribute('data-celda')
  if (nombre === null) throw new Error(`la fila «${id}» no tiene ${col}`)
  return nombre
}

// Abre la planilla de la fórmula de trabajo del origen y espera la grilla.
export async function abrirPlanilla(page: Page, origenId: string, consulta = ''): Promise<void> {
  await abrirLaFormula(page, origenId, 'planilla', consulta)
  await enLaPestana(page, 'Planilla')
  await expect(grilla(page)).toBeVisible()
}

// Doble clic en la celda, lo escrito y Enter: aplica y la entrada se cierra.
export async function escribirEnLaCelda(page: Page, en: Locator, texto: string): Promise<void> {
  await en.dblclick()
  const entrada = entradaDeLaCelda(page)
  await expect(entrada).toBeFocused()
  await entrada.fill(texto)
  await expect(entrada).toHaveValue(texto)
  await entrada.press('Enter')
  await expect(entrada).toBeHidden()
}

// Con una celda en edición, el clic en otra la nombra en lo que se escribe (Shift: el rango desde la anterior). La entrada sigue con el foco.
export async function clicParaReferenciar(page: Page, en: Locator, rango = false): Promise<void> {
  await en.click(rango ? { modifiers: ['Shift'] } : {})
  await expect(entradaDeLaCelda(page).or(textoDeLaBarra(page)).first()).toBeVisible()
}

// Elige la fila (su A) y abre su «⋯»: el menú abierto.
export async function menuDeLaFila(page: Page, id: string): Promise<Locator> {
  const a = celdaDe(page, id, 'A')
  await a.click()
  await expect(filaDe(page, id)).toHaveAttribute('data-activa', '')
  const numero = await a1De(page, id, 'A')
  await filaDe(page, id)
    .getByRole('button', { name: `Acciones de la fila ${numero.slice(1)}`, exact: true })
    .click()
  const menu = page.getByRole('menu')
  await expect(menu).toBeVisible()
  return menu
}

// Arrastra la fila por su número hasta antes o después de otra y suelta cuando la fila de destino ya marca dónde cae. Sin medir cajas (el spec puede ir sin
// celular): Playwright apunta relativo a cada elemento. El arrastre empieza al moverse 4 px dentro del asa; «antes» cae en el borde de arriba del destino y
// «después», 4 px sobre la fila que le sigue (el borde de abajo del destino).
export async function arrastrarFila(
  page: Page,
  id: string,
  hacia: string,
  lado: 'antes' | 'despues',
): Promise<void> {
  const destino = filaDe(page, hacia)
  // Al medio de la ventana: arriba la taparían la cabecera y la barra pegadas.
  await destino.evaluate((tr) => {
    tr.scrollIntoView({ block: 'center' })
  })
  // Sin `force`, `hover()` espera a que el asa reciba el puntero: un panel que se cierra deja su fondo encima mientras sale.
  const delAsa = filaDe(page, id).locator('[data-asa]')
  await delAsa.hover()
  await page.mouse.down()
  await delAsa.hover({ position: { x: 1, y: 1 }, force: true })
  if (lado === 'antes') await destino.hover({ position: { x: 4, y: 3 }, force: true })
  else {
    // La que le sigue puede ser de otro tramo (otro `<tbody>`, con su cabecera): la siguiente `tr` del documento, no la hermana.
    const siguiente = destino.locator('xpath=following::tr[1]')
    await expect(siguiente, `nada debajo de «${hacia}» donde soltar «después»`).toHaveCount(1)
    await siguiente.hover({ position: { x: 4, y: -4 }, force: true })
  }
  await expect(destino).toHaveAttribute('data-soltar', lado)
  await page.mouse.up()
  await expect(destino).not.toHaveAttribute('data-soltar', lado)
}

// La tabla `fletes` del origen, viva (sin congelar en la versión), con desde, hasta y monto: la que leen el catálogo de la planilla (BUSCARV) y la hoja.
export const FLETES = [
  { desde: 0, hasta: 1000, monto: 300 },
  { desde: 1000.01, hasta: 5000, monto: 450 },
]

export function sembrarFletes(origenId: string): void {
  const columnas = ['desde', 'hasta', 'monto'].map((clave) => ({
    clave,
    etiqueta: clave,
    tipo: 'numero',
  }))
  const filas = FLETES.map(
    (f, i) => `(v_id, $e2e$${JSON.stringify(f)}$e2e$::jsonb, ${String(i)})`,
  ).join(', ')
  sql(`
    do $f$
    declare v_id uuid;
    begin
      insert into public.tablas_referencia (origen_id, clave, nombre, columnas)
      values (${literal(origenId)}::uuid, 'fletes', 'Fletes', $e2e$${JSON.stringify(columnas)}$e2e$::jsonb)
      returning id into v_id;
      insert into public.tablas_referencia_filas (tabla_id, valores, orden) values ${filas};
    end $f$`)
}
