'use client'

import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip'
import type { ReactElement, ReactNode } from 'react'

type Props = {
  // El texto: también va en el nombre accesible de lo que lo lleva (un tooltip no es la única vía: en el celular no hay «pasar por encima»).
  texto: ReactNode
  // Lo que lo dispara, como elemento (Base UI le suma los eventos con `render`): un botón, una pestaña.
  children: ReactElement<Record<string, unknown>>
  lado?: 'top' | 'bottom'
}

// Un tooltip de texto corto sobre un elemento que ya se puede enfocar: aparece al pasar el mouse o al llegar con el teclado, y Esc lo cierra. Nunca lleva
// acciones adentro (lo que se hace va en el elemento o en su «⋯»).
export function ConTooltip({ texto, children, lado = 'top' }: Props) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger render={children} />
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Positioner side={lado} sideOffset={6} className="isolate z-50">
          <TooltipPrimitive.Popup
            data-slot="tooltip"
            className="max-w-(--available-width) rounded-(--radius-md) bg-(--color-ink) px-2 py-1 text-(length:--text-sm) text-(--color-surface) shadow-md data-closed:opacity-0 data-open:opacity-100 motion-safe:transition-opacity sm:max-w-72"
          >
            {texto}
          </TooltipPrimitive.Popup>
        </TooltipPrimitive.Positioner>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}
