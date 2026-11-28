// Lo que comparten los e2e del PDF de un arte (`artes-pdf-descarga.spec.ts`, `artes-pdf-contra-el-lienzo.spec.ts`): las capas de una página
// A4 (595 × 842 pt), elegir el vehículo de ejemplo en la barra, bajar el PDF con «Descargar PDF» y la página en PNG con el «⋯», como bytes.
import { readFile } from 'node:fs/promises'
import { BASE_DE_CAPA } from './artes-editor'
import { expect, type Download, type Page } from './prueba'

type Caja = { x: number; y: number; ancho: number; alto: number }

export const textoEn = (id: string, texto: string, caja: Caja, tamano = 22) => ({
  ...BASE_DE_CAPA,
  ...caja,
  id,
  tipo: 'texto',
  texto,
  fuente: 'geist',
  tamano,
  peso: 600,
  interlineado: 1.2,
  color: '#111111',
  alineacion: 'izquierda',
  borde: null,
  grosor: 0,
})

export const rectanguloEn = (id: string, caja: Caja, relleno: string) => ({
  ...BASE_DE_CAPA,
  ...caja,
  id,
  tipo: 'forma',
  forma: 'rectangulo',
  lados: null,
  relleno,
  borde: null,
  grosor: 0,
  radio: 0,
})

export const fotoEn = (id: string, caja: Caja) => ({
  ...BASE_DE_CAPA,
  ...caja,
  id,
  tipo: 'foto',
  indice: 0,
  ajuste: 'cubrir',
  foco: { x: 0.5, y: 0.5 },
  radio: 0,
  borde: null,
  grosor: 0,
})

// La página 1 de las pruebas: un recuadro de color con un texto encima (el vehículo, su VIN y el total) y la foto 1 debajo.
export const TEXTO_CON_DATOS = '{vehiculo}\nVIN: {vin}\nTotal: {total}'
export const paginaConDatos = (tamano = 22) => [
  rectanguloEn('recuadro', { x: 40, y: 40, ancho: 515, alto: 130 }, '#dbe4f0'),
  textoEn('datos', TEXTO_CON_DATOS, { x: 60, y: 56, ancho: 475, alto: 100 }, tamano),
  fotoEn('foto', { x: 40, y: 200, ancho: 515, alto: 340 }),
]

const disparador = (page: Page) => page.locator('[data-vehiculo-de-ejemplo-disparador]')

// Elige el vehículo en el popover de la barra (con su primera cotización, la que se elige de entrada) y lo cierra.
export async function elegirElVehiculo(
  page: Page,
  origen: string,
  vehiculo: { id: string; titulo: string },
): Promise<void> {
  await disparador(page).click()
  const popover = page.getByRole('dialog', { name: 'Vehículo de ejemplo' })
  await popover.getByLabel(`Buscar en ${origen}`).fill(vehiculo.titulo)
  await popover.locator(`[data-vehiculo-de-ejemplo="${vehiculo.id}"]`).click()
  await expect(disparador(page)).toContainText(`Vehículo de ejemplo: ${vehiculo.titulo}`)
  await expect(popover.getByText('Leyendo el vehículo…')).toBeHidden()
  await page.keyboard.press('Escape')
  await expect(popover).toBeHidden()
}

const bytesDe = async (descarga: Download) => readFile(await descarga.path())

export const botonDelPdf = (page: Page) =>
  page
    .locator('header')
    .first()
    .getByRole('button', { name: /^(Descargar PDF|Armando el PDF…)$/ })

// «Descargar PDF» de la barra: el archivo que bajó el navegador y su nombre.
export async function bajarElPdfDelEditor(page: Page): Promise<{ nombre: string; bytes: Buffer }> {
  const [descarga] = await Promise.all([page.waitForEvent('download'), botonDelPdf(page).click()])
  return { nombre: descarga.suggestedFilename(), bytes: await bytesDe(descarga) }
}

// «Exportar esta página en PNG» del «⋯» de la barra.
export async function exportarLaPaginaEnPng(page: Page, nombre: string): Promise<Buffer> {
  await page.getByRole('button', { name: `Más acciones de ${nombre}`, exact: true }).click()
  const [descarga] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('menuitem', { name: 'Exportar esta página en PNG', exact: true }).click(),
  ])
  return bytesDe(descarga)
}
