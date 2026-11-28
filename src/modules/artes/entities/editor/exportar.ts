// Lo puro de exportar un arte del editor: el nombre del archivo (el PNG de la página elegida y el PDF del documento), la escala de la miniatura
// de 480 px y los avisos. El PNG sale al tamaño del formato; en un formato de PDF, el de la página que se ve. Puro.
import type { Medidas } from '../formatos'

export const LADO_DE_LA_MINIATURA = 480
export const ESPERA_DE_LAS_IMAGENES_MS = 10000
export const MENSAJE_PDF_EN_BLANCO =
  'Esta plantilla de arte no tiene elementos: el PDF sale en blanco.'

type DelArchivo = {
  extension?: 'png' | 'pdf'
  // El número de la página (desde 1) que se exporta de un documento de varias; nulo con una sola.
  pagina?: number | null
}

// «Promo Hilux 2021» → «promo-hilux-2021.png» (la página 2 de varias, «promo-hilux-2021-pagina-2.png»): sin tildes, mayúsculas ni signos;
// nunca vacío.
export function nombreDelArchivo(
  nombre: string,
  { extension = 'png', pagina = null }: DelArchivo = {},
): string {
  const limpio = nombre
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  const base = limpio === '' ? 'arte' : limpio
  const conPagina = pagina === null ? base : `${base}-pagina-${String(pagina)}`
  return `${conPagina}.${extension}`
}

export function nombreDelPdf(nombre: string): string {
  return nombreDelArchivo(nombre, { extension: 'pdf' })
}

// El `pixelRatio` con que se exporta la miniatura: su lado mayor mide 480 px, y una plantilla más chica no se agranda.
export function ladoDeLaMiniatura(medidas: Medidas): number {
  const mayor = Math.max(medidas.ancho, medidas.alto)
  return mayor <= 0 ? 1 : Math.min(1, LADO_DE_LA_MINIATURA / mayor)
}

// Lo que se avisa si alguna imagen no cargó y el PNG salió sin ella; `null` si salieron todas.
export function textoDeImagenesQueFaltan(cuantas: number): string | null {
  if (cuantas <= 0) {
    return null
  }
  return cuantas === 1
    ? 'Se exportó sin 1 imagen que no cargó.'
    : `Se exportó sin ${String(cuantas)} imágenes que no cargaron.`
}

// Lo mismo para el PDF, que arma el servidor: las imágenes que no pudo bajar.
export function textoDeImagenesQueFaltanEnElPdf(cuantas: number): string | null {
  if (cuantas <= 0) {
    return null
  }
  return cuantas === 1
    ? 'El PDF salió sin 1 imagen que no cargó.'
    : `El PDF salió sin ${String(cuantas)} imágenes que no cargaron.`
}
