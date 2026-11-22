'use client'

import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'

export const PANEL_NUEVA_BANDA = 'nueva-banda'
export const PANEL_BANDA = 'banda'
export const PANEL_TOTAL = 'total-y-tipos-de-cambio'
export const PANEL_TIPO_DE_CELDA = 'tipo-de-celda'
export const PANEL_COMO_SE_ESCRIBE = 'como-se-escribe'
export const CLAVE_DE_LA_BANDA = 'banda'
export const CLAVE_DE_LA_FILA_DEL_TIPO = 'fila'
export const CLAVE_DEL_TIPO = 'tipo'
// La fila con que nace una banda nueva (no `fila`: esa la lee `useFilaPedida()` y la borra).
export const CLAVE_DE_LA_PRIMERA_FILA = 'con'
// Los paneles al costado («Totales» y «Tarjeta»): una clave propia, que no choca con `?panel=`; uno a la vez.
export const CLAVE_DEL_COSTADO = 'costado'
export const COSTADO_TOTALES = 'totales'
export const COSTADO_TARJETA = 'tarjeta'

// Los paneles de la planilla viven en la URL (D20): «Nueva banda» (`&con=<id>`: su primera fila), una banda (`&banda=<id>`), «Total y tipos de cambio», el tipo
// de celda de una fila (`&fila=<id>&tipo=<tipo>`) y «¿Cómo se escribe?»; al costado, `?costado=totales|tarjeta` (conviven con un `?panel=`).
export function usePanelesDeLaPlanilla() {
  return {
    nuevaBanda: usePanelPorUrl(PANEL_NUEVA_BANDA, [CLAVE_DE_LA_PRIMERA_FILA]),
    banda: usePanelPorUrl(PANEL_BANDA, [CLAVE_DE_LA_BANDA]),
    total: usePanelPorUrl(PANEL_TOTAL),
    tipo: usePanelPorUrl(PANEL_TIPO_DE_CELDA, [CLAVE_DE_LA_FILA_DEL_TIPO, CLAVE_DEL_TIPO]),
    ayuda: usePanelPorUrl(PANEL_COMO_SE_ESCRIBE),
    totales: usePanelPorUrl(COSTADO_TOTALES, [], { clave: CLAVE_DEL_COSTADO }),
    tarjeta: usePanelPorUrl(COSTADO_TARJETA, [], { clave: CLAVE_DEL_COSTADO }),
  }
}

export type PanelesDeLaPlanilla = ReturnType<typeof usePanelesDeLaPlanilla>
