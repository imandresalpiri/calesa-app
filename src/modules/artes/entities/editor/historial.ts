// Deshacer y rehacer en el editor de artes: los documentos de antes (`pasado`, el último es el más reciente) y los deshechos (`futuro`). Un
// gesto que se repite seguido (arrastrar, tipear en un campo, las flechas) es un solo paso: los cambios con la misma clave de fusión a menos de
// `ESPERA_DE_LA_FUSION_MS` del anterior no suman otro. Guarda hasta `TOPE_DEL_HISTORIAL` pasos. Puro.

export const TOPE_DEL_HISTORIAL = 100
export const ESPERA_DE_LA_FUSION_MS = 1000

export type FusionDelPaso = { clave: string; en: number }

export type Historial<T> = {
  pasado: readonly T[]
  futuro: readonly T[]
  // El último paso que se puede fundir con el siguiente; nulo después de deshacer, rehacer o un paso sin clave.
  fusion: FusionDelPaso | null
}

export function historialVacio<T>(): Historial<T> {
  return { pasado: [], futuro: [], fusion: null }
}

function seFunde(anterior: FusionDelPaso | null, nueva: FusionDelPaso | null): boolean {
  return (
    anterior !== null &&
    nueva !== null &&
    anterior.clave === nueva.clave &&
    nueva.en - anterior.en <= ESPERA_DE_LA_FUSION_MS
  )
}

// Anota un cambio: `anterior` es el documento antes de cambiar. Lo deshecho se pierde.
export function anotar<T>(
  historial: Historial<T>,
  anterior: T,
  fusion: FusionDelPaso | null,
): Historial<T> {
  if (seFunde(historial.fusion, fusion)) {
    return { pasado: historial.pasado, futuro: [], fusion }
  }
  return {
    pasado: [...historial.pasado, anterior].slice(-TOPE_DEL_HISTORIAL),
    futuro: [],
    fusion,
  }
}

export type Paso<T> = { historial: Historial<T>; documento: T }

// Vuelve al documento de antes; sin nada que deshacer, nulo.
export function deshacer<T>(historial: Historial<T>, actual: T): Paso<T> | null {
  const documento = historial.pasado.at(-1)
  if (documento === undefined) {
    return null
  }
  return {
    documento,
    historial: {
      pasado: historial.pasado.slice(0, -1),
      futuro: [...historial.futuro, actual],
      fusion: null,
    },
  }
}

// Rehace lo último que se deshizo; sin nada, nulo.
export function rehacer<T>(historial: Historial<T>, actual: T): Paso<T> | null {
  const documento = historial.futuro.at(-1)
  if (documento === undefined) {
    return null
  }
  return {
    documento,
    historial: {
      pasado: [...historial.pasado, actual].slice(-TOPE_DEL_HISTORIAL),
      futuro: historial.futuro.slice(0, -1),
      fusion: null,
    },
  }
}
