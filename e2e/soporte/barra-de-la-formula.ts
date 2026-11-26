import { expect, type Locator, type Page } from '@playwright/test'

// La barra de la fórmula, arriba de Planilla, Hoja y Tarjeta: el selector («Fórmula: <nombre> (activa)» o «Sin fórmulas»), el estado, «Versiones», «Tablas» y
// los botones del editor de la pestaña («Guardar el borrador», «Publicar…», su «⋯»), que llegan a la barra por un portal al hidratar.
export const barraDeLaFormula = (page: Page): Locator => page.locator('[data-barra-de-la-formula]')

// El estado de la pieza que se edita (`textoDelEstado()`: «Cambios sin guardar», «Borrador» o «Publicada vN»). El detalle de al lado (quién guardó el
// borrador) se ve desde `md`.
export const estadoDeLaBarra = (page: Page): Locator =>
  barraDeLaFormula(page).locator('[data-estado-de-la-edicion]')
export const detalleDelEstado = (page: Page): Locator =>
  estadoDeLaBarra(page).locator('xpath=following-sibling::span[1]')

// `tapado`: también bajo un modal (la copia con avisos abre «Información de la fórmula» al llegar).
export const selectorDeFormula = (page: Page, tapado = false): Locator =>
  barraDeLaFormula(page).getByRole('button', {
    name: /^(Fórmula: |Sin fórmulas)/,
    includeHidden: tapado,
  })

// El popover del selector: la lista «Fórmulas del origen» (cada fila, un enlace a la misma pestaña con `?formula=<id>` y su «⋯»), «Nueva fórmula» y «Archivadas».
export const popoverDelSelector = (page: Page): Locator =>
  page.locator('[data-slot="popover-content"]').filter({
    has: page.getByRole('button', { name: 'Nueva fórmula' }),
  })

export const listaDeFormulas = (page: Page): Locator =>
  popoverDelSelector(page).getByRole('list', { name: 'Fórmulas del origen' })

// La fila de una fórmula en el selector abierto (sin archivar o archivada), por su nombre.
export const filaDelSelector = (page: Page, nombre: string): Locator =>
  popoverDelSelector(page)
    .locator('li[data-formula-del-origen]')
    .filter({
      has: page.getByRole('link', { name: new RegExp(`(^|\\s)${escaparRegex(nombre)}(\\s|$)`) }),
    })

function escaparRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Abre el selector de la barra y espera su contenido (la lista o, sin fórmulas, «Nueva fórmula»).
export async function abrirElSelector(page: Page): Promise<Locator> {
  await selectorDeFormula(page).click()
  const popover = popoverDelSelector(page)
  await expect(popover).toBeVisible()
  return popover
}

// Elige en el selector la acción del «⋯» de una fórmula (Renombrar, Copiar, Activar…, Archivar, Eliminar): el selector se cierra y se abre su panel
// (`?panel=<accion>-formula&cual=<id>`).
export async function accionDeLaFormula(
  page: Page,
  nombre: string,
  accion: string | RegExp,
): Promise<void> {
  await abrirElSelector(page)
  await popoverDelSelector(page)
    .getByRole('button', { name: `Más acciones de ${nombre}` })
    .click()
  await page.getByRole('menuitem', { name: accion }).click()
}

// «Versiones» de la barra en la Planilla: abre su drawer (`?panel=versiones`) con la lista de versiones de la fórmula elegida («Revertir» en cada archivada).
// Antes de hidratar el clic no vale: se insiste hasta que la URL lo pida (y no más, para no sumar entradas al historial).
export async function abrirLasVersiones(page: Page): Promise<Locator> {
  const boton = barraDeLaFormula(page).getByRole('button', { name: 'Versiones', exact: true })
  const drawer = page.getByRole('dialog', { name: 'Versiones' })
  await expect(async () => {
    if (!page.url().includes('panel=versiones')) {
      await boton.click()
    }
    await expect(drawer).toBeVisible({ timeout: 1_000 })
  }).toPass()
  return drawer
}
