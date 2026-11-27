import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import { probarLaVuelta } from '@/shared/ui/vuelta-del-foco.soporte'
import { PANEL_DESCARTAR_PLANTILLA } from '../../../entities/plantilla/descartar-la-plantilla'
import {
  PANEL_DE_LA_CELDA,
  PANEL_DE_LAS_COLUMNAS,
  PANEL_INFORMACION_DE_LA_TARJETA,
} from '../../../entities/plantilla/paneles-del-editor'
import { PANEL_PUBLICAR_TARJETA } from '../../../entities/plantilla/publicar-la-plantilla'
import { usePanelDeLaTarjeta } from './use-panel-de-la-tarjeta'

type Panel = ReturnType<typeof usePanelDeLaTarjeta>

// Lo que abre la pestaña (`?panel=publicar-tarjeta|descartar-plantilla|info-tarjeta|celda|columnas`): tras recargar con el panel abierto, «atrás» devuelve el foco a quien lo abrió.
probarLaVuelta({
  hook: 'usePanelDeLaTarjeta',
  usar: usePanelDeLaTarjeta,
  clave: 'panel',
  cerrada: '',
  aperturas: [
    {
      nombre: 'abrirPublicar',
      abrir: (panel: Panel) => {
        panel.abrirPublicar()
      },
      abierta: `?panel=${PANEL_PUBLICAR_TARJETA}`,
      abierto: (panel: Panel) => panel.publicando,
    },
    {
      nombre: 'abrirDescartar',
      abrir: (panel: Panel) => {
        panel.abrirDescartar()
      },
      abierta: `?panel=${PANEL_DESCARTAR_PLANTILLA}`,
      abierto: (panel: Panel) => panel.descartando,
    },
    {
      nombre: 'abrirInformacion',
      abrir: (panel: Panel) => {
        panel.abrirInformacion()
      },
      abierta: `?panel=${PANEL_INFORMACION_DE_LA_TARJETA}`,
      abierto: (panel: Panel) => panel.informando,
    },
    {
      nombre: 'abrirCelda',
      abrir: (panel: Panel) => {
        panel.abrirCelda()
      },
      abierta: `?panel=${PANEL_DE_LA_CELDA}`,
      abierto: (panel: Panel) => panel.celda,
    },
    {
      nombre: 'abrirColumnas',
      abrir: (panel: Panel) => {
        panel.abrirColumnas()
      },
      abierta: `?panel=${PANEL_DE_LAS_COLUMNAS}`,
      abierto: (panel: Panel) => panel.columnas,
    },
  ],
  cerrar: (panel) => {
    panel.cerrar()
  },
})

afterEach(() => {
  cleanup()
  document.body.replaceChildren()
  history.replaceState(null, '')
})
