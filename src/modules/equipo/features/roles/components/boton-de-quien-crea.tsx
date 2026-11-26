'use client'

import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { Button } from '@/shared/ui/button'

export const TITULO_DE_QUIEN_CREA_Y_QUIEN_VE = 'Quién crea y quién ve'
export const PANEL_DE_QUIEN_CREA_Y_QUIEN_VE = 'quien-crea-y-quien-ve'

// El botón que abre «Quién crea y quién ve» desde el bloque «Cotizaciones» de la matriz: el cuadro vive en un modal con su URL
// (`?panel=quien-crea-y-quien-ve`, con `?origen=` para el lugar), no desplegado dentro de la tabla. Mide lo mismo siempre.
export function BotonDeQuienCrea() {
  const panel = usePanelPorUrl(PANEL_DE_QUIEN_CREA_Y_QUIEN_VE, ['origen'])
  return (
    <Button
      type="button"
      variant="outline"
      aria-haspopup="dialog"
      className="h-11 md:h-8"
      onClick={() => {
        panel.abrir()
      }}
    >
      Ver quién crea y quién ve
    </Button>
  )
}
