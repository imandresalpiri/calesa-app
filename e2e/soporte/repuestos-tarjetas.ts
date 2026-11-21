import type { Locator, Page } from '@playwright/test'
import { expect } from './prueba'

// Los ítems de `/repuestos/[id]` son tarjetas: un clic abre su drawer con la fila como Excel, «⋯» lleva Imágenes, Stock, Mover a… y Eliminar, y «Agregar ítem» abre un drawer con la fila nueva.
// Estos ayudantes son lo único que sabe cómo se llega a cada cosa; los specs no repiten los nombres.

/** La tarjeta de un ítem por su nombre (su descripción, si no tiene tipo de pieza ni condición). */
export const tarjetaDe = (page: Page, nombre: string): Locator =>
  page.locator('[data-tarjeta-de-item]').filter({
    has: page.getByRole('button', { name: `Abrir ${nombre}`, exact: true }),
  })

/** Abre el drawer del ítem con un clic en su tarjeta y lo devuelve (su nombre es la descripción del ítem). `nombre`: cómo se llama la tarjeta si no es su descripción («Bomba de agua · Usado»). */
export async function abrirItem(
  page: Page,
  descripcion: string,
  nombre: string = descripcion,
): Promise<Locator> {
  await page.getByRole('button', { name: `Abrir ${nombre}`, exact: true }).click()
  const drawer = page.getByRole('dialog', { name: descripcion, exact: true })
  await expect(drawer).toBeVisible()
  return drawer
}

/** La fila del ítem (la «Excel») dentro de su drawer. */
export const filaDelItem = (drawer: Locator): Locator => drawer.locator('[data-fila-de-item]')

/** Elige una línea del «⋯» de la tarjeta del ítem («Imágenes», «Stock», «Mover a…», «Eliminar»). */
export async function accionDelItem(page: Page, nombre: string, accion: string) {
  await page.getByRole('button', { name: `Más acciones de ${nombre}`, exact: true }).click()
  await page.getByRole('menuitem', { name: accion, exact: true }).click()
}

/** Abre «Agregar ítem» y devuelve su drawer; con descripciones, agrega cada una con el teclado (Enter) y lo cierra. */
export async function agregarItems(page: Page, descripciones: readonly string[] = []) {
  await page.getByRole('button', { name: 'Agregar ítem', exact: true }).click()
  const drawer = page.getByRole('dialog', { name: 'Agregar ítems' })
  await expect(drawer).toBeVisible()
  const nueva = drawer.getByLabel('Nuevo ítem: descripción')
  for (const descripcion of descripciones) {
    await nueva.fill(descripcion)
    await nueva.press('Enter')
    await expect(drawer.getByLabel(`Descripción del ítem ${descripcion}`)).toBeVisible()
    await expect(nueva).toBeFocused()
  }
  if (descripciones.length > 0) {
    await nueva.press('Escape')
    await expect(drawer).toBeHidden()
  }
  return drawer
}
