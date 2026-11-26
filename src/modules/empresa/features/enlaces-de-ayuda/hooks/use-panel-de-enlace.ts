'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { abrirConVuelta, useVueltaDelFoco } from '@/shared/ui/vuelta-del-foco'
import {
  CLAVE_DEL_ENLACE,
  PANEL_DE_ENLACES_DE_AYUDA,
} from '../../../entities/paneles-de-enlaces-de-ayuda'

const PARAMETROS = {
  [CLAVE_DE_PANEL]: parseAsString,
  [CLAVE_DEL_ENLACE]: parseAsString,
}

// El modal de un enlace, en la URL: `?panel=<nuevo>` o `?panel=<editar>&enlace=<id>` (los de la empresa o los propios, según quien lo usa).
// Abrir suma al historial («atrás» lo cierra; tras recargar, devuelve el foco a quien lo abrió); cerrar quita el id y vuelve a la lista de su
// tarjeta, en una sola escritura.
export function usePanelDeEnlace(panelNuevo: string, panelEditar: string) {
  const [url, setUrl] = useQueryStates(PARAMETROS)
  const panel = url[CLAVE_DE_PANEL]
  const nuevo = panel === panelNuevo
  const hayEdicion = panel === panelEditar
  const editando = hayEdicion ? url[CLAVE_DEL_ENLACE] : null
  useVueltaDelFoco(CLAVE_DE_PANEL, nuevo || hayEdicion)
  return {
    nuevo,
    editando,
    hayEdicion,
    abrirNuevo: () => {
      abrirConVuelta(
        CLAVE_DE_PANEL,
        () =>
          setUrl({ [CLAVE_DE_PANEL]: panelNuevo, [CLAVE_DEL_ENLACE]: null }, { history: 'push' }),
        nuevo,
      )
    },
    abrirEdicion: (id: string) => {
      abrirConVuelta(
        CLAVE_DE_PANEL,
        () =>
          setUrl({ [CLAVE_DE_PANEL]: panelEditar, [CLAVE_DEL_ENLACE]: id }, { history: 'push' }),
        editando === id,
      )
    },
    cerrar: () => {
      void setUrl({ [CLAVE_DE_PANEL]: PANEL_DE_ENLACES_DE_AYUDA, [CLAVE_DEL_ENLACE]: null })
    },
  }
}
