'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { abrirConVuelta, useVueltaDelFoco } from '@/shared/ui/vuelta-del-foco'
import {
  CLAVE_DEL_LOGO,
  PANEL_DE_LOGOS,
  PANEL_NUEVO_LOGO,
  PANEL_RENOMBRAR_LOGO,
} from '../../../entities/paneles-de-logos'

const PARAMETROS = {
  [CLAVE_DE_PANEL]: parseAsString,
  [CLAVE_DEL_LOGO]: parseAsString,
}

// El modal de una variante, en la URL: `?panel=nuevo-logo` o `?panel=renombrar-logo&logo=<id>`. Abrir suma al historial («atrás» lo cierra; tras
// recargar, devuelve el foco a quien lo abrió); cerrar quita el id y vuelve a la lista, en una sola escritura.
export function usePanelDeLogo() {
  const [url, setUrl] = useQueryStates(PARAMETROS)
  const panel = url[CLAVE_DE_PANEL]
  const nuevo = panel === PANEL_NUEVO_LOGO
  const hayRenombre = panel === PANEL_RENOMBRAR_LOGO
  const renombrando = hayRenombre ? url[CLAVE_DEL_LOGO] : null
  useVueltaDelFoco(CLAVE_DE_PANEL, nuevo || hayRenombre)
  return {
    nuevo,
    renombrando,
    hayRenombre,
    abrirNuevo: () => {
      abrirConVuelta(
        CLAVE_DE_PANEL,
        () =>
          setUrl(
            { [CLAVE_DE_PANEL]: PANEL_NUEVO_LOGO, [CLAVE_DEL_LOGO]: null },
            { history: 'push' },
          ),
        nuevo,
      )
    },
    abrirRenombre: (id: string) => {
      abrirConVuelta(
        CLAVE_DE_PANEL,
        () =>
          setUrl(
            { [CLAVE_DE_PANEL]: PANEL_RENOMBRAR_LOGO, [CLAVE_DEL_LOGO]: id },
            { history: 'push' },
          ),
        renombrando === id,
      )
    },
    cerrar: () => {
      void setUrl({ [CLAVE_DE_PANEL]: PANEL_DE_LOGOS, [CLAVE_DEL_LOGO]: null })
    },
  }
}
