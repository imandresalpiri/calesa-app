// El editor de campos (el mismo en un origen y en los leads): la fila de un campo, su «⋯» y las casillas de dato clave.
import { expect, type Page } from './prueba'

// La fila de un campo: el `li` que tiene su toque («Editar X», o «Ver X» sin permiso).
export function filaDelCampo(page: Page, etiqueta: string) {
  return page.locator('li', {
    has: page.getByRole('button', { name: new RegExp(`^(Editar|Ver) ${escapar(etiqueta)}$`) }),
  })
}

// Abre el «⋯» de `nombre` («Color», o «VIN en los datos clave» para una casilla) y elige una línea.
export async function elegirDelMenu(page: Page, nombre: string, linea: string) {
  await page.getByRole('button', { name: `Más acciones de ${nombre}`, exact: true }).click()
  const opcion = page.getByRole('menuitem', { name: linea, exact: true })
  await expect(opcion).toBeEnabled()
  await opcion.click()
}

// Abre el «⋯» de `nombre`, comprueba que la línea está apagada (su motivo va en la nota) y lo cierra.
export async function lineaApagada(page: Page, nombre: string, linea: string) {
  await page.getByRole('button', { name: `Más acciones de ${nombre}`, exact: true }).click()
  await expect(page.getByRole('menuitem', { name: linea, exact: true })).toBeDisabled()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menu')).toBeHidden()
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
