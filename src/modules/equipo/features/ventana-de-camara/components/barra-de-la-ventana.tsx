'use client'

import { GripHorizontalIcon, MinusIcon } from 'lucide-react'
import type { HTMLAttributes, ReactNode } from 'react'
import { Button } from '@/shared/ui/button'

type Props = {
  // Los manejadores de arrastre (`useGestoDeLaVentana`).
  gestoDeArrastre: HTMLAttributes<HTMLDivElement>
  // El botón ⚙ con su popover.
  ajustes: ReactNode
  alMinimizar: () => void
}

// La barra de la ventana de cámara: se arrastra por ella; lleva «EN VIVO», los ajustes (⚙) y «Minimizar».
export function BarraDeLaVentana({ gestoDeArrastre, ajustes, alMinimizar }: Props) {
  return (
    <div
      data-barra-de-la-ventana=""
      {...gestoDeArrastre}
      className="flex h-8 shrink-0 cursor-grab touch-none items-center gap-1 border-b border-(--color-line) bg-(--color-surface-2) pr-1 pl-2 select-none active:cursor-grabbing"
    >
      <GripHorizontalIcon aria-hidden className="size-4 text-(--color-ink-faint)" />
      <span className="flex items-center gap-1.5 text-(length:--text-xs) font-semibold tracking-wide text-(--color-peligro-ink)">
        <span className="punto-en-vivo" aria-hidden />
        EN VIVO
      </span>
      <span className="ml-auto flex items-center">
        {ajustes}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Minimizar la ventana de cámara"
          title="Minimizar"
          onClick={alMinimizar}
        >
          <MinusIcon aria-hidden />
        </Button>
      </span>
    </div>
  )
}
