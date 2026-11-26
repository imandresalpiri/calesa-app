'use client'

import { useReactFlow } from '@xyflow/react'
import { MaximizeIcon, MinusIcon, PlusIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'

type Props = { sinAnimar: () => boolean }

// Los controles del zoom, propios y en español: «Acercar», «Alejar» y «Ver todo el flujo». También va con el pellizco o Ctrl/Cmd + rueda.
export function ControlesDelZoom({ sinAnimar }: Props) {
  const { zoomIn, zoomOut, fitView } = useReactFlow()
  const duracion = () => (sinAnimar() ? 0 : 200)
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Acercar"
        title="Acercar"
        onClick={() => void zoomIn({ duration: duracion() })}
      >
        <PlusIcon aria-hidden />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Alejar"
        title="Alejar"
        onClick={() => void zoomOut({ duration: duracion() })}
      >
        <MinusIcon aria-hidden />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Ver todo el flujo"
        title="Ver todo el flujo"
        onClick={() => void fitView({ padding: 0.1, maxZoom: 1, duration: duracion() })}
      >
        <MaximizeIcon aria-hidden />
      </Button>
    </>
  )
}
