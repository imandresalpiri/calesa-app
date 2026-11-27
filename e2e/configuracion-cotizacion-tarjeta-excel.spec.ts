import { expect, test, type Page } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { borrarPersonasDePrueba, borrarRolesDePrueba } from './soporte/base'
import { capturar } from './soporte/recorrido'
import {
  COLOR_SIN_CONTRASTE,
  definicionGuardada,
  limpiarTerrenoExcel,
  prepararTerrenoExcel,
  type TerrenoExcel,
} from './soporte/tarjeta-excel'
import { abrirLaFormula } from './soporte/rutas-de-la-formula'
import {
  abrirElPanel,
  elegirLaReferencia,
  operacionDeLaBarra,
  barraDelLienzo,
} from './soporte/plantilla'

// @sin-celular-archivo: editor de Configuración que se usa en una pantalla de al menos 1.024 px; por debajo, un aviso y la tarjeta en sólo lectura

// El editor de la tarjeta como Excel (T325, `docs/UX.md` › «Cotización: tarjeta (estados propios)»): sobre un borrador de la forma 2 y con la cotización de referencia
// del origen, quien configura elige un rango con Shift+flechas, combina, escribe con F2, copia y pega formato, deshace y rehace, ensancha una columna arrastrando,
// mueve una fila con el teclado, elige un dato con su monto, pone un color con el aviso de contraste, oculta una fila «si no aplica» (la ve en «Ocultas con esta
// referencia»), guarda el borrador (el historial sigue) y publica con nota. Una forma 1 se abre convertida. La pantalla de menos de 1.024 px (el aviso y la tarjeta en sólo
// lectura) la prueba `pestana-de-la-tarjeta.test.tsx`: un archivo sin celular no puede preguntar por el ancho.
test.describe.configure({ mode: 'serial' })

let terreno: TerrenoExcel | undefined

const t = () => {
  if (!terreno) throw new Error('No hay terreno.')
  return terreno
}

test.beforeAll(async ({}, info) => {
  info.setTimeout(180_000)
  terreno = await prepararTerrenoExcel(info.project.name)
})

test.afterAll(async ({}, info) => {
  info.setTimeout(120_000)
  limpiarTerrenoExcel()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const lienzo = (page: Page) => page.getByRole('grid', { name: 'Lienzo de la tarjeta' })
const casilla = (page: Page, f: number, k: number) =>
  lienzo(page).locator(`[data-pos="${String(f)}:${String(k)}"]`)
const tarjeta = (page: Page) => page.locator('[data-tarjeta-de-cotizacion]')
const anuncio = (page: Page) => page.locator('[data-anuncio-del-editor]')

async function abrirElEditor(page: Page, origenId: string) {
  await abrirLaFormula(page, origenId, 'tarjeta')
  await expect(page.getByRole('heading', { name: /^Tarjeta de / })).toBeVisible()
  await expect(lienzo(page)).toBeVisible()
}

// Elige una casilla con el puntero y deja el foco en la grilla (antes de un atajo: LECCIONES › e2e).
async function elegir(page: Page, f: number, k: number) {
  await casilla(page, f, k).click()
  await expect(casilla(page, f, k)).toHaveAttribute('aria-selected', 'true')
  await expect(lienzo(page)).toBeFocused()
}

test('E2E elegir un rango, combinar, escribir con F2, copiar formato, deshacer y rehacer', async ({
  page,
}, info) => {
  await entrar(page, t().configuradora, { fresco: true })
  await abrirElEditor(page, t().origen.id)
  await barraDelLienzo(page).getByRole('button', { name: 'Ver', exact: true }).click()
  await expect(
    page.getByRole('menuitemradio', { name: /^(?!Cifras)/, checked: true }).first(),
  ).toBeVisible()
  await page.keyboard.press('Escape')
  await capturar(page, info, 'lienzo')

  // Shift+→ dos veces desde la fila del rango: tres casillas elegidas.
  await elegir(page, 1, 0)
  await page.keyboard.press('Shift+ArrowRight')
  await page.keyboard.press('Shift+ArrowRight')
  for (const k of [0, 1, 2])
    await expect(casilla(page, 1, k)).toHaveAttribute('aria-selected', 'true')
  await capturar(page, info, 'rango')
  await operacionDeLaBarra(page, 'Filas y columnas', 'Combinar')
  await expect(anuncio(page)).toContainText('Se combinaron 3 celdas.')
  await expect(casilla(page, 1, 0)).toHaveAttribute('aria-colspan', '3')

  // F2 escribe en el lugar; Enter confirma.
  await lienzo(page).focus()
  await page.keyboard.press('F2')
  const campo = page.getByRole('textbox', { name: 'Texto de la celda' })
  await expect(campo).toBeFocused()
  await campo.fill('Hola tarjeta')
  await page.keyboard.press('Enter')
  await expect(tarjeta(page).locator('[data-fila="f_rango"]')).toHaveText('Hola tarjeta')
  await expect(lienzo(page)).toBeFocused()

  // Ctrl+C sobre el TOTAL (negrita, fondo verde) y Ctrl+V en la leyenda del remate: se pega el formato.
  await elegir(page, 4, 0)
  await page.keyboard.press('Control+c')
  await expect(anuncio(page)).toContainText('Se copió una celda.')
  await elegir(page, 2, 2)
  await page.keyboard.press('Control+v')
  await expect(anuncio(page)).toContainText('Se pegó una celda.')
  const pegada = tarjeta(page).locator('[data-fila="f_remate"][data-columna="leyenda"]')
  await expect(pegada).toHaveAttribute('data-color', 'verde')
  await expect(pegada).toHaveCSS('font-weight', '600')
  await expect(pegada).toHaveText('TOTAL')

  // Ctrl+Z deshace el pegado; Ctrl+Y y Ctrl+Shift+Z lo rehacen.
  await page.keyboard.press('Control+z')
  await expect(anuncio(page)).toContainText('Deshiciste: pegar.')
  await expect(pegada).toHaveCount(0)
  await page.keyboard.press('Control+y')
  await expect(pegada).toHaveAttribute('data-color', 'verde')
  await page.keyboard.press('Control+z')
  await expect(pegada).toHaveCount(0)
  await page.keyboard.press('Control+Shift+z')
  await expect(anuncio(page)).toContainText('Rehiciste: pegar.')
  await expect(pegada).toHaveText('TOTAL')
})

test('E2E ensanchar una columna arrastrando y mover una fila con el teclado sobre su asa', async ({
  page,
}) => {
  await entrar(page, t().configuradora, { fresco: true })
  await abrirElEditor(page, t().origen.id)
  const ancho = page.locator('[data-cabecera-de-columna="concepto"] [data-ancho-de-columna]')
  await expect(ancho).toHaveText('190 px')
  // Con `hover` en pasos sobre la cabecera de al lado (el borde toma el puntero y la sigue), sin medir: la cabecera dice el ancho nuevo.
  await page.locator('[data-borde-de-columna="concepto"]').hover()
  await page.mouse.down()
  const vecina = page.locator('[data-cabecera-de-columna="monto"]')
  for (const x of [10, 20, 30]) await vecina.hover({ position: { x, y: 8 } })
  await page.mouse.up()
  await expect(ancho).not.toHaveText('190 px')

  // Espacio toma el asa del remate, ↑ la sube y Espacio la suelta: queda segunda.
  const asa = page.locator('[data-asa-de-fila="f_remate"] button')
  await expect(asa).toHaveText('3')
  await asa.focus()
  await page.keyboard.press('Space')
  await expect(asa).toHaveAttribute('aria-pressed', 'true')
  // El sensor de teclado de dnd-kit escucha recién un momento después de tomar la fila: una flecha antes se pierde. Se insiste sólo
  // mientras el anuncio siga en su lugar (una flecha que entró no se repite: la fila subiría dos).
  const enSuLugar = page.getByText('La fila 3 va en el lugar 3 de 5.', { exact: true })
  const subida = page.getByText('La fila 3 va en el lugar 2 de 5.', { exact: true })
  await expect(enSuLugar).toBeAttached()
  await expect(async () => {
    if ((await enSuLugar.count()) > 0) await page.keyboard.press('ArrowUp')
    await expect(subida).toBeAttached({ timeout: 1000 })
  }).toPass()
  await page.keyboard.press('Space')
  await expect(page.getByText('Soltaste la fila 3 en el lugar 2.', { exact: true })).toBeAttached()
  await expect(asa).toHaveText('2')
})

test('E2E elegir un dato con su monto, un color con el aviso de contraste y ocultar una fila «si no aplica»', async ({
  page,
}, info) => {
  await entrar(page, t().configuradora, { fresco: true })
  await abrirElEditor(page, t().origen.id)

  // «Dato» en la leyenda del título: la grúa con su monto de la referencia.
  await elegir(page, 2, 2)
  const panel = await abrirElPanel(page, 'Celda')
  await panel.getByRole('radio', { name: 'Dato' }).click()
  await panel.locator('[data-nodo-para-elegir="grua"]').click()
  await expect(panel.getByLabel('Qué mostrar')).toHaveValue('monto')
  const grua = tarjeta(page).locator('[data-nodo="grua"][data-mostrar="monto"]')
  await expect(grua).toContainText(/\d/)
  await capturar(page, info, 'panel-de-la-celda')

  // Un fondo con el que el texto no se lee: el aviso suave, que no frena.
  await panel
    .getByRole('radiogroup', { name: 'Fondo' })
    .locator(`[data-color="${COLOR_SIN_CONTRASTE}"]`)
    .click()
  await expect(panel.locator('[data-aviso-de-contraste]')).toBeVisible()
  await expect(grua).toHaveAttribute('data-color', COLOR_SIN_CONTRASTE)

  // La fila del transporte a Chile se oculta si no aplica: con la gasolina de la referencia, va a «Ocultas con esta referencia (1)».
  await page.locator('[data-asa-de-fila="f_chile"] button').click()
  await expect(panel.locator('[data-panel-de-la-fila="f_chile"]')).toBeVisible()
  await panel.getByLabel('Ocultar la fila').selectOption('no_aplica')
  await panel.getByLabel('El nodo que la decide').selectOption('transporte_chile')
  const ocultas = page.locator('[data-ocultas-con-esta-referencia]')
  await expect(
    ocultas.getByRole('heading', { name: 'Ocultas con esta referencia (1)' }),
  ).toBeVisible()
  await expect(ocultas.locator('[data-oculta="f_chile"]')).toContainText(
    /No aplica en esta cotización: la variante es /,
  )
  await capturar(page, info, 'ocultas')
  // Con las cifras de ejemplo no se oculta nada.
  await elegirLaReferencia(page, 'ejemplo')
  await expect(ocultas).toHaveCount(0)
  await elegirLaReferencia(page, 'cotizacion')
  await expect(ocultas).toBeVisible()
})

test('E2E guardar el borrador y publicarlo con nota: la forma 2 en la base', async ({
  page,
}, info) => {
  await entrar(page, t().configuradora, { fresco: true })
  await abrirElEditor(page, t().origen.id)
  await elegir(page, 0, 0)
  await page.keyboard.press('F2')
  await page.getByRole('textbox', { name: 'Texto de la celda' }).fill('Título guardado')
  await page.keyboard.press('Enter')
  await page.getByRole('button', { name: 'Guardar borrador' }).click()
  await expect(page.getByText('Se guardó el borrador.')).toBeVisible()
  await expect
    .poll(() => JSON.stringify(definicionGuardada(t().origen.id, 'borrador')))
    .toContain('Título guardado')

  await expect(page.getByRole('button', { name: 'Publicar…' })).toBeEnabled()
  await page.getByRole('button', { name: 'Publicar…' }).click()
  const modal = page.getByRole('dialog', { name: /^Publicar la tarjeta de / })
  await modal.getByLabel('Nota de la versión').fill('Primera tarjeta como Excel')
  await capturar(page, info, 'publicar')
  await modal.getByRole('button', { name: 'Publicar', exact: true }).click()
  await expect(modal).toBeHidden()
  await expect
    .poll(
      () => (definicionGuardada(t().origen.id, 'publicada') as { forma?: number } | null)?.forma,
    )
    .toBe(2)
  expect(JSON.stringify(definicionGuardada(t().origen.id, 'publicada'))).toContain(
    'Título guardado',
  )
})

test('E2E una plantilla de la forma 1 se abre convertida a cuadrícula', async ({ page }) => {
  await entrar(page, t().configuradora, { fresco: true })
  await abrirElEditor(page, t().deLaForma1.id)
  await expect(page.getByText('Se convirtió a cuadrícula: revisa y guarda.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Guardar borrador' })).toBeEnabled()
})
