// El editor de campos (el mismo en un origen y en los leads): la fila de un campo, su «⋯» y las casillas de dato clave.
import { expect, type Page } from './prueba'

// La fila de un campo: el `li` que tiene su toque («Editar X», o «Ver X» sin permiso).
export function filaDelCampo(page: Page, etiqueta: string) {
  return page.locator('li', {
    has: page.getByRole('button', { name: new RegExp(`^(Editar|Ver) ${escapar(etiqueta)}$`) }),
  })
}

// La lista llega dibujada del servidor y un clic antes de hidratar se pierde: se insiste, con tope corto, hasta que el menú de ese botón
// se abre (y no de más: otro clic lo cerraría). Antes, que ningún otro menú siga abierto o cerrándose.
export async function abrirElMenu(page: Page, nombre: string) {
  const boton = page.getByRole('button', { name: `Más acciones de ${nombre}`, exact: true })
  await expect(page.getByRole('menu')).toHaveCount(0)
  await expect(async () => {
    if ((await boton.getAttribute('aria-expanded')) !== 'true') await boton.click()
    await expect(boton).toHaveAttribute('aria-expanded', 'true', { timeout: 1_000 })
  }).toPass({ timeout: 10_000 })
  await expect(page.getByRole('menu')).toBeVisible()
}

// Tocar la fila abre su panel (`?campo=<id>`): se insiste hasta que la URL lo pide, y no de más (cada clic suma una entrada al historial).
export async function abrirElCampo(page: Page, etiqueta: string) {
  const toque = page.getByRole('button', {
    name: new RegExp(`^(Editar|Ver) ${escapar(etiqueta)}$`),
  })
  await expect(async () => {
    if (!/[?&]campo=/.test(page.url())) await toque.click()
    await expect(page).toHaveURL(/[?&]campo=/, { timeout: 1_000 })
  }).toPass({ timeout: 10_000 })
  await expect(page.getByRole('dialog')).toBeVisible()
}

// Abre el «⋯» de `nombre` («Color», o «VIN en los datos clave» para una casilla) y elige una línea.
export async function elegirDelMenu(page: Page, nombre: string, linea: string) {
  await abrirElMenu(page, nombre)
  const opcion = page.getByRole('menuitem', { name: linea, exact: true })
  await expect(opcion).toBeEnabled()
  await opcion.click()
}

// Abre el «⋯» de `nombre`, comprueba que la línea está apagada (su motivo va en la nota) y lo cierra.
export async function lineaApagada(page: Page, nombre: string, linea: string) {
  await abrirElMenu(page, nombre)
  await expect(page.getByRole('menuitem', { name: linea, exact: true })).toBeDisabled()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menu')).toHaveCount(0)
}

// Las casillas llenas, en orden (lo que dice cada una); las libres no cuentan.
export async function casillasEnOrden(page: Page): Promise<string[]> {
  const llenas = page
    .getByRole('region', { name: /^Datos clave \(\d de 4\)$/ })
    .locator('ol > li[data-casilla]')
  return (await llenas.locator('span.font-medium').allTextContents()).map((texto) => texto.trim())
}

function escapar(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
