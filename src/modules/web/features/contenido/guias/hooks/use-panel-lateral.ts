'use client'

import { useSyncExternalStore } from 'react'
import { useAlMenos } from '@/shared/ui/ancho-de-pantalla'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { escribirPanelDeLaGuia, leerPanelDeLaGuia } from './panel-lateral'

// Desde este ancho el panel está al lado del texto; debajo, en un cajón (`?panel=lateral`).
export const CORTE_DEL_PANEL = 1024
const PANEL_EN_CAJON = 'lateral'
const EVENTO = 'guia-panel'

function suscribir(alCambiar: () => void) {
  window.addEventListener('storage', alCambiar)
  window.addEventListener(EVENTO, alCambiar)
  return () => {
    window.removeEventListener('storage', alCambiar)
    window.removeEventListener(EVENTO, alCambiar)
  }
}

// El panel de la guía: al lado del texto desde 1024 px (se oculta y se recuerda) y en un cajón de la URL debajo. `abierto` dice si se ve ahora.
export function usePanelLateral() {
  const alLado = useAlMenos(CORTE_DEL_PANEL)
  const visible = useSyncExternalStore(
    suscribir,
    () => leerPanelDeLaGuia(window.localStorage),
    () => true,
  )
  const cajon = usePanelPorUrl(PANEL_EN_CAJON)
  return {
    alLado,
    abierto: alLado ? visible : cajon.abierto,
    abrir: () => {
      if (alLado) {
        escribirPanelDeLaGuia(window.localStorage, true)
        window.dispatchEvent(new Event(EVENTO))
      } else {
        cajon.abrir()
      }
    },
    cerrar: () => {
      if (alLado) {
        escribirPanelDeLaGuia(window.localStorage, false)
        window.dispatchEvent(new Event(EVENTO))
      } else {
        cajon.cerrar()
      }
    },
  }
}
