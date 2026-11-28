// Lo puro de exportar un arte del editor: el nombre del archivo, la escala de la miniatura de 480 px y los avisos. El PNG sale al tamaño del
// formato; un formato de PDF no se exporta desde acá (lo arman las plantillas de PDF). Puro.
import type { Medidas } from '../formatos'

export const LADO_DE_LA_MINIATURA = 480
export const ESPERA_DE_LAS_IMAGENES_MS = 10000
export const MENSAJE_SIN_PDF = 'El PDF se arma con las plantillas de PDF.'

// «Promo Hilux 2021» → «promo-hilux-2021.png»: sin tildes, mayúsculas ni signos; nunca vacío.
export function nombreDelArchivo(nombre: string): string {
  const limpio = nombre
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `${limpio === '' ? 'arte' : limpio}.png`
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
