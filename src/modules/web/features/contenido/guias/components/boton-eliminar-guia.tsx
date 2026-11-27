'use client'

import { Button } from '@/shared/ui/button'
import { useEliminarGuiaPorUrl } from '../hooks/use-eliminar-guia-por-url'

// «Eliminar guía»: abre la confirmación (`?eliminar=guia`), que vive aparte en `<ConfirmarEliminarGuia>`.
export function BotonEliminarGuia() {
  const url = useEliminarGuiaPorUrl()
  return (
    <Button
      type="button"
      variant="outline"
      className="min-h-11 w-fit text-(--color-peligro-ink) md:min-h-9"
      onClick={() => {
        url.abrir()
      }}
    >
      Eliminar guía
    </Button>
  )
}
