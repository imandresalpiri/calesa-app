'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { abrirConVuelta, useVueltaDelFoco } from '@/shared/ui/vuelta-del-foco'
import { PANEL_DESCARTAR_PLANTILLA } from '../../../entities/plantilla/descartar-la-plantilla'
import {
  PANEL_DE_LA_CELDA,
  PANEL_DE_LAS_COLUMNAS,
  PANEL_INFORMACION_DE_LA_TARJETA,
} from '../../../entities/plantilla/paneles-del-editor'
import { PANEL_PUBLICAR_TARJETA } from '../../../entities/plantilla/publicar-la-plantilla'

const PARAMETROS = { [CLAVE_DE_PANEL]: parseAsString }

// Lo que la pestaña «Tarjeta» abre aparte, en la URL: los modales `?panel=publicar-tarjeta` y `?panel=descartar-plantilla` (4.19-3c) y `?panel=info-tarjeta`, y los
// paneles al costado `?panel=celda` y `?panel=columnas` (uno a la vez: abrir uno cambia al otro). Abrir suma al historial («atrás» lo cierra);
// cerrar quita la clave. Sin `shallow: false`: abrirlo no necesita al servidor, la pestaña ya está. Un solo hook para los dos porque `useVueltaDelFoco` se llama una vez
// por clave: dos hooks con la misma clave se pisarían. Tras recargar con el modal abierto, «atrás» devuelve el foco a quien lo abrió (`vuelta-del-foco.ts`).
export function usePanelDeLaTarjeta() {
  const [url, setUrl] = useQueryStates(PARAMETROS)
  const panel = url[CLAVE_DE_PANEL]
  const publicando = panel === PANEL_PUBLICAR_TARJETA
  const descartando = panel === PANEL_DESCARTAR_PLANTILLA
  const informando = panel === PANEL_INFORMACION_DE_LA_TARJETA
  const celda = panel === PANEL_DE_LA_CELDA
  const columnas = panel === PANEL_DE_LAS_COLUMNAS
  useVueltaDelFoco(CLAVE_DE_PANEL, publicando || descartando || informando || celda || columnas)
  const abrir = (valor: string, abierto: boolean) => {
    abrirConVuelta(
      CLAVE_DE_PANEL,
      () => setUrl({ [CLAVE_DE_PANEL]: valor }, { history: 'push' }),
      abierto,
    )
  }
  return {
    publicando,
    descartando,
    informando,
    celda,
    columnas,
    abrirInformacion: () => {
      abrir(PANEL_INFORMACION_DE_LA_TARJETA, informando)
    },
    abrirCelda: () => {
      abrir(PANEL_DE_LA_CELDA, celda)
    },
    abrirColumnas: () => {
      abrir(PANEL_DE_LAS_COLUMNAS, columnas)
    },
    abrirPublicar: () => {
      abrirConVuelta(
        CLAVE_DE_PANEL,
        () => setUrl({ [CLAVE_DE_PANEL]: PANEL_PUBLICAR_TARJETA }, { history: 'push' }),
        publicando,
      )
    },
    abrirDescartar: () => {
      abrirConVuelta(
        CLAVE_DE_PANEL,
        () => setUrl({ [CLAVE_DE_PANEL]: PANEL_DESCARTAR_PLANTILLA }, { history: 'push' }),
        descartando,
      )
    },
    cerrar: () => {
      void setUrl({ [CLAVE_DE_PANEL]: null })
    },
  }
}

export type PanelDeLaTarjeta = ReturnType<typeof usePanelDeLaTarjeta>
