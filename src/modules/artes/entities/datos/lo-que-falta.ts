// El aviso sobre el lienzo cuando el vehículo de ejemplo no llena todo lo que la plantilla de arte nombra: «A esta plantilla le faltan datos
// con este vehículo: la foto 3, el VIN y la cotización.», con tope (los primeros 5 y «y N más»). Habla del documento entero: lo que falta en
// cada página se junta sin repetir (`juntarLoQueFalta`). Puro.
import type { Falta } from './capas-con-datos'

export const TOPE_DE_LO_QUE_FALTA = 5

export function textoDeLoQueFalta(faltan: readonly Falta[]): string | null {
  if (faltan.length === 0) {
    return null
  }
  const nombres = faltan.slice(0, TOPE_DE_LO_QUE_FALTA).map((falta) => falta.nombre)
  const resto = faltan.length - nombres.length
  const lista =
    resto > 0
      ? `${nombres.join(', ')} y ${String(resto)} más`
      : nombres.length < 2
        ? (nombres[0] ?? '')
        : `${nombres.slice(0, -1).join(', ')} y ${nombres.at(-1) ?? ''}`
  return `A esta plantilla le faltan datos con este vehículo: ${lista}.`
}

// Lo que falta en cada página, en el orden de las páginas y sin repetir un dato (la foto 3 que falta en dos páginas se nombra una vez).
export function juntarLoQueFalta(porPagina: readonly (readonly Falta[])[]): readonly Falta[] {
  if (porPagina.length === 1) {
    return porPagina[0] ?? []
  }
  const juntas = new Map<string, Falta>()
  for (const falta of porPagina.flat()) {
    if (!juntas.has(falta.clave)) {
      juntas.set(falta.clave, falta)
    }
  }
  return [...juntas.values()]
}

// Lo que identifica una lista de lo que falta: el aviso cerrado vuelve a abrirse sólo si cambia.
export function claveDeLoQueFalta(faltan: readonly Falta[]): string {
  return faltan.map((falta) => falta.clave).join('|')
}
