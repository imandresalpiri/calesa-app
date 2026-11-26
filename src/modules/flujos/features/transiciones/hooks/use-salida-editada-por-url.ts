'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import {
  CLAVE_DE_LA_SALIDA_EDITADA,
  CLAVE_EDITAR,
  PANEL_EDITAR_SALIDA,
} from '../../../entities/transiciones/vista-de-salidas'

const PARAMETROS = { [CLAVE_EDITAR]: parseAsString, [CLAVE_DE_LA_SALIDA_EDITADA]: parseAsString }

// La salida en edición en el inspector, en la URL (`?editar=salida&editada=<id>`): la abre «Editar» en su fila, tocar su flecha en el diagrama o crearla
// arrastrando el asa. Se escribe con `replace` (abrir y cerrar una forma no suma al historial). `editar` lo comparte con requisitos (`editar=requisito`):
// cerrar sólo borra el suyo. Un id que todavía no está en la fase (la salida recién creada, que llega con la relectura) no abre nada ni limpia la URL.
export function useSalidaEditadaPorUrl() {
  const [url, escribir] = useQueryStates(PARAMETROS, { history: 'replace' })
  const editando =
    url[CLAVE_EDITAR] === PANEL_EDITAR_SALIDA ? (url[CLAVE_DE_LA_SALIDA_EDITADA] ?? null) : null
  return {
    editando,
    editar: (id: string | null) => {
      if (id === null && editando === null) return
      void escribir(
        id === null
          ? { [CLAVE_EDITAR]: null, [CLAVE_DE_LA_SALIDA_EDITADA]: null }
          : { [CLAVE_EDITAR]: PANEL_EDITAR_SALIDA, [CLAVE_DE_LA_SALIDA_EDITADA]: id },
      )
    },
  }
}
