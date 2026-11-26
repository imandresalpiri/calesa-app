'use client'

import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'

// `?panel=vista-previa`: la vista previa de la guía a pantalla completa vive en la URL (se recarga, se cierra con «atrás»).
export const PANEL_VISTA_PREVIA_DE_LA_GUIA = 'vista-previa'

export function useVistaPreviaPorUrl() {
  return usePanelPorUrl(PANEL_VISTA_PREVIA_DE_LA_GUIA)
}
