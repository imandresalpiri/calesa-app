'use client'

import { useState } from 'react'
import { avisarCambioDeDinero } from './eventos-de-dinero'

// Si la lectura no llega (sin red, un error) el modal no queda trabado: «Recargar» vuelve a estar a mano.
const TOPE_DE_LA_RECARGA_MS = 8000

/**
 * «Recargar» de un conflicto en el modal de un gasto o un pago: relee la lista de la unidad y la versión nueva llega con `original` (el conflicto se va solo, lo escrito
 * queda). `recargando` vale mientras no llegue otra lectura (`original` cambia de objeto, aunque traiga la misma versión), siga el conflicto y no pase el tope; un conflicto
 * nuevo lo apaga (`alConflicto`).
 */
export function useRecargaDeDinero(unidadId: string, conflicto: string | null, original: unknown) {
  const [desde, setDesde] = useState<{ original: unknown } | null>(null)
  return {
    recargar: () => {
      const marca = { original }
      setDesde(marca)
      avisarCambioDeDinero(unidadId)
      setTimeout(() => {
        setDesde((antes) => (antes === marca ? null : antes))
      }, TOPE_DE_LA_RECARGA_MS)
    },
    recargando: desde !== null && desde.original === original && conflicto !== null,
    alConflicto: () => {
      setDesde(null)
    },
  }
}
