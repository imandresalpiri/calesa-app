import { expect, type Locator, type Page } from '@playwright/test'

// «Información de la fórmula»: el botón ⓘ junto al estado de la barra de la fórmula (en la Planilla) y su modal (`?panel=info-formula`) con las secciones
// «Publicada», «Borrador» (con «Descartar el borrador…») y «Lo que cambió al copiar la fórmula». Sin la barra (la puesta en marcha), el botón va con su texto.
export const NOMBRE_DE_LA_INFORMACION = 'Información de la fórmula'

export const botonDeLaInformacion = (page: Page): Locator =>
  page.getByRole('button', { name: NOMBRE_DE_LA_INFORMACION, exact: true })

export const informacion = (page: Page): Locator =>
  page.getByRole('dialog', { name: NOMBRE_DE_LA_INFORMACION })

// La marca de aviso del botón (sin publicada, borrador atrasado o avisos de la copia pendientes).
export const marcaDeLaInformacion = (page: Page): Locator =>
  botonDeLaInformacion(page).locator('[data-marca-de-la-informacion]')

// Abre el modal y lo devuelve. Con `?panel=info-formula` ya en la URL (tras «atrás» o al llegar de una copia) sólo lo espera: el modal llega diferido y mirar
// si se ve daría «no» mientras se monta.
export async function abrirLaInformacion(page: Page): Promise<Locator> {
  const modal = informacion(page)
  if (new URL(page.url()).searchParams.get('panel') !== 'info-formula') {
    await botonDeLaInformacion(page).click()
  }
  await expect(modal).toBeVisible()
  return modal
}

// Una sección del modal, abriéndolo antes.
export async function seccionDeLaInformacion(
  page: Page,
  nombre: 'Publicada' | 'Borrador' | 'Lo que cambió al copiar la fórmula',
): Promise<Locator> {
  return (await abrirLaInformacion(page)).getByRole('region', { name: nombre })
}

export async function cerrarLaInformacion(page: Page): Promise<void> {
  const modal = informacion(page)
  if (new URL(page.url()).searchParams.get('panel') === 'info-formula') {
    await modal.getByRole('button', { name: 'Cerrar' }).click()
  }
  await expect(modal).toHaveCount(0)
}
