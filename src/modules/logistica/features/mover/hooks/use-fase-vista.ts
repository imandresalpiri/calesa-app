'use client'

import { parseAsString, useQueryState } from 'nuqs'
import { CLAVE_DE_FASE_VISTA } from '../../../entities/mover/fase-vista'

const PARSER = parseAsString.withOptions({ history: 'replace', shallow: true })

// La fase que se mira en la cadena de la unidad (`?fase_vista=<clave del nodo>`): recargar la conserva. Elegir reemplaza la entrada del historial (mirar no es navegar) y no
// va al servidor. `null` = la actual.
export function useFaseVista(): [string | null, (clave: string | null) => void] {
  const [clave, escribir] = useQueryState(CLAVE_DE_FASE_VISTA, PARSER)
  return [
    clave,
    (nueva) => {
      void escribir(nueva)
    },
  ]
}
