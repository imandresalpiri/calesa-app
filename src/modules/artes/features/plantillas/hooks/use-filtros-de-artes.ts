'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { useTransition } from 'react'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { CLAVE_DE_FORMATO, CLAVE_DE_ORIGEN, CLAVE_DE_QUIENES } from '../../../entities/filtros'

const PARAMETROS = {
  [CLAVE_DE_ORIGEN]: parseAsString,
  [CLAVE_DE_FORMATO]: parseAsString,
  [CLAVE_DE_QUIENES]: parseAsString,
  [CLAVE_DE_PANEL]: parseAsString,
}

type Clave = typeof CLAVE_DE_ORIGEN | typeof CLAVE_DE_FORMATO | typeof CLAVE_DE_QUIENES

// Los filtros de la pestaña Plantillas en la URL (`shallow: false`: el servidor vuelve a leer la primera página; lo que vale lo decide
// `pedidoDePlantillas()`). Elegir «Todos» borra la clave. Otro filtro cierra el panel abierto (lo que nombra puede no estar en la lista nueva).
// Mientras llega la lista nueva, `pendiente`.
export function useFiltrosDeArtes() {
  const [pendiente, startTransition] = useTransition()
  const [, setParametros] = useQueryStates(PARAMETROS, { shallow: false, startTransition })
  const aplicar = (cambio: Partial<Record<Clave, string | null>>) => {
    void setParametros({ ...cambio, [CLAVE_DE_PANEL]: null })
  }
  return {
    pendiente,
    elegir: (clave: Clave, valor: string | null) => {
      aplicar({ [clave]: valor })
    },
    limpiar: () => {
      aplicar({ [CLAVE_DE_ORIGEN]: null, [CLAVE_DE_FORMATO]: null, [CLAVE_DE_QUIENES]: null })
    },
  }
}

export type FiltrosDeArtes = ReturnType<typeof useFiltrosDeArtes>
