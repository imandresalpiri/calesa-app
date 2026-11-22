'use client'

import { Button } from '@/shared/ui/button'
import { usePanelDeDatos } from './use-panel-de-datos'

// «Datos» en la cabecera de la página de un origen, desde 768 px (en el celular va primero en el «⋯»).
export function BotonDeDatos() {
  const panel = usePanelDeDatos()
  return (
    <Button
      type="button"
      variant="outline"
      aria-haspopup="dialog"
      className="hidden min-h-11 md:inline-flex md:min-h-9"
      onClick={() => {
        panel.abrir()
      }}
    >
      Datos
    </Button>
  )
}
