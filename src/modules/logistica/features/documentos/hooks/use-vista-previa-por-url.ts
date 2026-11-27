'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { useMemo } from 'react'
import { recordarQuienAbre } from '@/shared/ui/foco-de-quien-abre'
import { abrirConVuelta, useVueltaDelFoco } from '@/shared/ui/vuelta-del-foco'
import {
  CLAVE_DE_DOCUMENTO,
  PANELES_DE_UN_DOCUMENTO,
} from '../../../entities/documentos/paneles-de-documento'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'

// La vista previa de un documento en la URL (`?documento=<id>`): se puede recargar, «atrás» la cierra y se comparte. Pasar a otro documento con las flechas **reemplaza** la entrada del historial
// (un «atrás» cierra la vista previa, no recorre los documentos). Se abre sólo si el `?panel=` no es uno de los diálogos de un documento (eliminar, editar): esos llevan el mismo `?documento=`.
export function useVistaPreviaPorUrl() {
  const parsers = useMemo(
    () => ({ [CLAVE_DE_DOCUMENTO]: parseAsString, [CLAVE_DE_PANEL]: parseAsString }),
    [],
  )
  const [valores, escribir] = useQueryStates(parsers)
  const panel = valores[CLAVE_DE_PANEL]
  const id =
    panel !== null && PANELES_DE_UN_DOCUMENTO.includes(panel) ? null : valores[CLAVE_DE_DOCUMENTO]
  const abierto = id !== null
  useVueltaDelFoco(CLAVE_DE_DOCUMENTO, abierto)
  return {
    // El id de la URL (nulo = cerrada).
    id,
    abrir: (documentoId: string) => {
      recordarQuienAbre()
      abrirConVuelta(
        CLAVE_DE_DOCUMENTO,
        () => escribir({ [CLAVE_DE_DOCUMENTO]: documentoId }, { history: 'push' }),
        abierto,
      )
    },
    // Pasa a otro documento sin sumar entradas al historial.
    pasarA: (documentoId: string) => {
      void escribir({ [CLAVE_DE_DOCUMENTO]: documentoId }, { history: 'replace' })
    },
    cerrar: () => {
      void escribir({ [CLAVE_DE_DOCUMENTO]: null })
    },
  }
}
