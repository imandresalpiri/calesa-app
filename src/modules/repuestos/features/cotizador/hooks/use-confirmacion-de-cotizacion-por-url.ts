'use client'

import { useApertura } from '@/shared/ui/use-apertura'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import {
  CLAVE_DE_COTIZACION,
  PANEL_ACEPTAR_COTIZACION,
  PANEL_ANULAR_COTIZACION,
} from '../../../entities/cotizador/paneles'

// Una confirmación de la cotización en la URL (8.12-4, C13): se puede recargar y «atrás» la cierra. Si al llegar no se puede (`motivo`), no abre: se
// avisa y la URL se limpia, una vez; lo que cambia con el diálogo abierto no lo cierra (el diálogo dice por qué falló). Desde la lista, la URL lleva además
// `?cotizacion=<id>` (la hoja de una cotización no la necesita).
function useConfirmacionPorUrl(panel: string, motivo: string | null) {
  const url = usePanelPorUrl(panel, [CLAVE_DE_COTIZACION])
  const apertura = useApertura(url.abierto)
  const rechazado = useRevisionAlAbrir(url.abierto ? String(apertura) : null, motivo, url.cerrar)
  return {
    abierto: url.abierto && !rechazado,
    abrir: (cotizacionId?: string) => {
      url.abrir(cotizacionId === undefined ? {} : { [CLAVE_DE_COTIZACION]: cotizacionId })
    },
    cerrar: url.cerrar,
  }
}

export type ConfirmacionPorUrl = ReturnType<typeof useConfirmacionPorUrl>

/** `?panel=aceptar-cotizacion`. */
export function useAceptarPorUrl(motivo: string | null) {
  return useConfirmacionPorUrl(PANEL_ACEPTAR_COTIZACION, motivo)
}

/** `?panel=anular-cotizacion`. */
export function useAnularPorUrl(motivo: string | null = null) {
  return useConfirmacionPorUrl(PANEL_ANULAR_COTIZACION, motivo)
}
