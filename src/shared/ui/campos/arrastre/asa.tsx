'use client'

import { GripVerticalIcon } from 'lucide-react'
import type { Asa } from './use-ordenable'

// El asa: lo único que toma la fila, con el puntero o con el teclado (Espacio). 44 px en px; `touch-none` para que el dedo arrastre en vez
// de desplazar la página. Apagada (`aria-disabled`, lo pone dnd-kit) mientras un cambio viaja.
export function AsaDeArrastre({ etiqueta, asa }: { etiqueta: string; asa: Asa }) {
  const { alMontar, atributos, oyentes } = asa
  return (
    <button
      type="button"
      ref={alMontar}
      {...atributos}
      {...oyentes}
      aria-label={etiqueta}
      className="inline-flex min-h-[44px] min-w-[44px] shrink-0 cursor-grab touch-none items-center justify-center rounded-(--radius-md) text-(--color-ink-soft) outline-none hover:bg-(--color-surface-2) focus-visible:shadow-(--shadow-focus) active:cursor-grabbing aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
    >
      <GripVerticalIcon aria-hidden className="size-4" />
    </button>
  )
}
