'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { useTransition } from 'react'
import { CLAVE_DE_CAMBIO } from '../../../entities/actividad'
import { CLAVE_DE_ENTIDAD, CLAVE_DE_PERSONA, CLAVE_DE_REGISTRO } from '../../../entities/filtros'

const PARAMETROS = {
  [CLAVE_DE_PERSONA]: parseAsString,
  [CLAVE_DE_ENTIDAD]: parseAsString,
  [CLAVE_DE_REGISTRO]: parseAsString,
  [CLAVE_DE_CAMBIO]: parseAsString,
}

// Los filtros de `/actividad` en la URL (`shallow: false`: el servidor vuelve a leer la primera página con ellos; lo que vale lo decide
// `pedidoDeActividad()`). Otro filtro cierra el cambio abierto (puede no estar en la lista nueva) y otra entidad suelta el registro, que
// sólo vale con la suya. Mientras llega la lista nueva, `pendiente`.
export function useFiltrosDeActividad() {
  const [pendiente, startTransition] = useTransition()
  const [, setParametros] = useQueryStates(PARAMETROS, { shallow: false, startTransition })
  const aplicar = (cambio: Partial<Record<keyof typeof PARAMETROS, string | null>>) => {
    void setParametros({ ...cambio, [CLAVE_DE_CAMBIO]: null })
  }
  return {
    pendiente,
    elegirPersona: (id: string | null) => {
      aplicar({ [CLAVE_DE_PERSONA]: id })
    },
    elegirEntidad: (tabla: string | null) => {
      aplicar({ [CLAVE_DE_ENTIDAD]: tabla, [CLAVE_DE_REGISTRO]: null })
    },
    quitarRegistro: () => {
      aplicar({ [CLAVE_DE_REGISTRO]: null })
    },
    limpiar: () => {
      aplicar({ [CLAVE_DE_PERSONA]: null, [CLAVE_DE_ENTIDAD]: null, [CLAVE_DE_REGISTRO]: null })
    },
  }
}

export type FiltrosDeActividad = ReturnType<typeof useFiltrosDeActividad>
