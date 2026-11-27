import { expect, test, type Page } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { borrarPersonasDePrueba, borrarRolesDePrueba } from './soporte/base'
import {
  abrirElPanel,
  barraDelLienzo,
  casillaDelLienzo,
  lienzoDeLaTarjeta,
  panelDeLaTarjeta,
} from './soporte/plantilla'
import { abrirLaFormula } from './soporte/rutas-de-la-formula'
import {
  limpiarTerrenoExcel,
  prepararTerrenoExcel,
  type TerrenoExcel,
} from './soporte/tarjeta-excel'

// @sin-celular-archivo: editor de Configuración que se usa en una pantalla de al menos 1.024 px; por debajo, un aviso y la tarjeta en sólo lectura

// La tarjeta al frente (`docs/UX.md` › «Cotización: tarjeta (estados propios)»): la barra única, los atajos del editor (combinar, separar, insertar una fila, «?» con su
// lista) y el panel que se abre aparte, con su URL, sin mover el lienzo.
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

const anuncio = (page: Page) => page.locator('[data-anuncio-del-editor]')

async function abrirElEditor(page: Page) {
  await entrar(page, t().configuradora, { fresco: true })
  await abrirLaFormula(page, t().origen.id, 'tarjeta')
  await expect(lienzoDeLaTarjeta(page)).toBeVisible()
}

// Elige una casilla con el puntero y deja el foco en la grilla (antes de un atajo).
async function elegir(page: Page, f: number, k: number) {
  await casillaDelLienzo(page, f, k).click()
  await expect(casillaDelLienzo(page, f, k)).toHaveAttribute('aria-selected', 'true')
  await expect(lienzoDeLaTarjeta(page)).toBeFocused()
}

test('E2E combinar, separar e insertar una fila con el teclado, y «?» lista los atajos del editor', async ({
  page,
}) => {
  await abrirElEditor(page)
  await elegir(page, 1, 0)
  await page.keyboard.press('Shift+ArrowRight')
  await page.keyboard.press('Shift+ArrowRight')

  await page.keyboard.press('Alt+m')
  await expect(anuncio(page)).toContainText('Se combinaron 3 celdas.')
  await expect(casillaDelLienzo(page, 1, 0)).toHaveAttribute('aria-colspan', '3')

  await page.keyboard.press('Alt+u')
  await expect(anuncio(page)).toContainText('Se separó la celda.')
  await expect(casillaDelLienzo(page, 1, 0)).not.toHaveAttribute('aria-colspan', '3')

  const filas = await page.locator('[data-asa-de-fila]').count()
  await page.keyboard.press('Alt+r')
  await expect(anuncio(page)).toContainText('Se insertó una fila abajo.')
  await expect(page.locator('[data-asa-de-fila]')).toHaveCount(filas + 1)

  // La grilla enfocada deja pasar «?»: la lista trae lo del editor, con las mismas teclas que los menús.
  await lienzoDeLaTarjeta(page).focus()
  await page.keyboard.press('?')
  const lista = page.getByRole('dialog', { name: 'Atajos de teclado' })
  await expect(lista).toBeVisible()
  await expect(lista.getByText('Editor de la tarjeta')).toBeVisible()
  for (const texto of [
    'Combinar las celdas elegidas',
    'Separar las celdas combinadas',
    'Insertar una fila abajo',
    'Insertar una fila arriba',
    'Insertar una columna a la derecha',
    'Insertar una columna a la izquierda',
    'Guardar el borrador',
  ])
    await expect(lista.getByText(texto)).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(lista).toBeHidden()

  // Se deshace la fila (el borrador de partida queda como estaba) y Ctrl+S guarda un cambio.
  await lienzoDeLaTarjeta(page).focus()
  await page.keyboard.press('Control+z')
  await expect(page.locator('[data-asa-de-fila]')).toHaveCount(filas)
  await elegir(page, 0, 0)
  await page.keyboard.press('F2')
  await page.getByRole('textbox', { name: 'Texto de la celda' }).fill('Título con atajos')
  await page.keyboard.press('Enter')
  await expect(lienzoDeLaTarjeta(page)).toBeFocused()
  await page.keyboard.press('Control+s')
  await expect(page.getByText('Se guardó el borrador.')).toBeVisible()
})

test('E2E el panel de una celda se abre por la URL, sobrevive a recargar y no mueve el lienzo', async ({
  page,
}) => {
  await abrirElEditor(page)
  const lienzo = lienzoDeLaTarjeta(page)
  const antes = await lienzo.boundingBox()
  expect(antes).not.toBeNull()
  const igual = async (donde: string) => {
    const caja = await lienzo.boundingBox()
    expect(caja, donde).toEqual(antes)
  }

  // Elegir una celda y una fila no lo mueve.
  await elegir(page, 4, 0)
  await igual('al elegir una celda')
  await page.locator('[data-asa-de-fila] button').nth(2).click()
  await igual('al elegir una fila')
  await elegir(page, 4, 0)

  // Con «Celda»: ?panel=celda, el panel a la vista y el lienzo donde estaba.
  await expect(panelDeLaTarjeta(page)).toHaveCount(0)
  const panel = await abrirElPanel(page, 'Celda')
  await expect(page).toHaveURL(/panel=celda/)
  await igual('al abrir el panel')
  await expect(panel.getByRole('radiogroup', { name: 'Contenido' })).toBeVisible()

  // Escribir en el lienzo con el panel abierto tampoco lo mueve.
  await elegir(page, 3, 0)
  await page.keyboard.press('F2')
  const campo = page.getByRole('textbox', { name: 'Texto de la celda' })
  await campo.fill('Total del trato')
  await page.keyboard.press('Enter')
  await igual('al escribir en una celda')

  // Recargar con el panel abierto lo deja abierto.
  await page.reload()
  await expect(lienzoDeLaTarjeta(page)).toBeVisible()
  await expect(panelDeLaTarjeta(page)).toBeVisible()
  await expect(page).toHaveURL(/panel=celda/)

  // Cerrar lo quita de la URL y el lienzo sigue en su lugar.
  await page.keyboard.press('Escape')
  await expect(panelDeLaTarjeta(page)).toHaveCount(0)
  await expect(page).not.toHaveURL(/panel=/)
  await igual('al cerrar el panel')
})

test('E2E Enter sobre un dato abre el panel de la celda en «Contenido»', async ({ page }) => {
  await abrirElEditor(page)
  // El remate (fila 3, columna 2) es un dato.
  await elegir(page, 2, 1)
  await page.keyboard.press('Enter')
  await expect(panelDeLaTarjeta(page)).toBeVisible()
  await expect(page).toHaveURL(/panel=celda/)
  await expect(
    panelDeLaTarjeta(page).getByRole('radiogroup', { name: 'Contenido' }).getByRole('radio', {
      checked: true,
    }),
  ).toBeFocused()
  await expect(barraDelLienzo(page)).toBeVisible()
})
