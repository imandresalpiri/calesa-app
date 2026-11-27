'use client'

import { useState } from 'react'
import { avisarCambioDeDinero } from './eventos-de-dinero'

/**
 * «Recargar» de un conflicto en el modal de un gasto o un pago: relee la lista de la unidad y la versión nueva llega con `original` (el conflicto se va solo, lo escrito
 * queda). `recargando` vale mientras el conflicto siga; uno nuevo lo apaga (`alConflicto`).
 */
export function useRecargaDeDinero(unidadId: string, conflicto: string | null) {
  const [recargando, setRecargando] = useState(false)
  return {
    recargar: () => {
      setRecargando(true)
      avisarCambioDeDinero(unidadId)
    },
    recargando: recargando && conflicto !== null,
    alConflicto: () => {
      setRecargando(false)
    },
  }
}
