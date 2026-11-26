// Elegir en un combo de catálogo (`ComboDeCatalogo` de `shared`: el grupo de un campo, la categoría de una FAQ o de una guía) como lo
// hace una persona: abrirlo por su rótulo, escribir el nombre y tocar el que ya existe o «Crear … «nombre»».
import { expect, type Locator, type Page } from '@playwright/test'

const escapar = (texto: string) => texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// El botón del combo: su nombre accesible es el rótulo y lo elegido («Grupo Sin grupo»).
export const comboDe = (dentro: Locator | Page, etiqueta: string): Locator =>
  dentro.getByRole('button', { name: new RegExp(`^${escapar(etiqueta)} `) })

export async function elegirEnCombo(
  page: Page,
  dentro: Locator | Page,
  etiqueta: string,
  nombre: string,
): Promise<void> {
  const combo = comboDe(dentro, etiqueta)
  await combo.click()
  const buscar = page.locator('[cmdk-input]')
  await buscar.fill(nombre)
  // El que existe se llama así; si no existe, la última opción lo crea (la del que existe con otra escritura no la ofrece).
  const existente = page.getByRole('option', { name: nombre, exact: true })
  const crear = page.getByRole('option', { name: new RegExp(`^Crear .*«${escapar(nombre)}»$`) })
  await existente.or(crear).first().click()
  await expect(buscar).toBeHidden()
  await expect(combo).toHaveAccessibleName(`${etiqueta} ${nombre}`)
}
