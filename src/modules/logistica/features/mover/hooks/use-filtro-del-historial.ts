'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { useCallback } from 'react'
import {
  CLAVE_DEL_FILTRO_DE_FASE,
  CLAVE_DEL_FILTRO_DE_QUIEN,
  filtroDesdeLaUrl,
  type FiltroDelHistorial,
} from '../../../entities/mover/filtro-del-historial'

const CLAVES = {
  [CLAVE_DEL_FILTRO_DE_FASE]: parseAsString,
  [CLAVE_DEL_FILTRO_DE_QUIEN]: parseAsString,
}

// El filtro del historial en la URL (`?historial_fase=`, `?historial_quien=`): recargar lo conserva; cambiarlo reemplaza la entrada del historial del navegador y no va al
// servidor (la lista se lee en el navegador). Un valor que no es un id se ignora.
export function useFiltroDelHistorial(): [
  FiltroDelHistorial,
  (cambio: Partial<FiltroDelHistorial>) => void,
] {
  const [valores, escribir] = useQueryStates(CLAVES, { history: 'replace', shallow: true })
  const filtro = filtroDesdeLaUrl({
    fase: valores[CLAVE_DEL_FILTRO_DE_FASE],
    quien: valores[CLAVE_DEL_FILTRO_DE_QUIEN],
  })
  const cambiar = useCallback(
    (cambio: Partial<FiltroDelHistorial>) => {
      void escribir({
        ...('fase' in cambio ? { [CLAVE_DEL_FILTRO_DE_FASE]: cambio.fase ?? null } : {}),
        ...('quien' in cambio ? { [CLAVE_DEL_FILTRO_DE_QUIEN]: cambio.quien ?? null } : {}),
      })
    },
    [escribir],
  )
  return [filtro, cambiar]
}
