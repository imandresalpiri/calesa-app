'use client'

import type { LucideIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'

type Props = {
  etiqueta: string
  Icono: LucideIcon
  // Nulo si se puede agregar; si no, por qué (sólo lectura, el tope de capas): va en el título y el botón no hace nada.
  motivo: string | null
  alHacer: () => void
  // Lo que se escribe en el texto, a la derecha y tenue (`{marca}`).
  detalle?: string
}

// Un botón de la pestaña «Agregar» en una fila: el icono, lo que agrega y, si lo hay, el detalle. Apagado sigue enfocable y dice su motivo.
export function BotonDeAgregar({ etiqueta, Icono, motivo, alHacer, detalle }: Props) {
  return (
    <Button
      type="button"
      variant="ghost"
      aria-disabled={motivo !== null}
      title={motivo ?? undefined}
      onClick={() => {
        if (motivo === null) {
          alHacer()
        }
      }}
      className="h-auto min-h-8 w-full min-w-0 justify-start gap-2 px-2 py-1 text-left font-normal aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:bg-transparent"
    >
      <Icono aria-hidden className="text-(--color-ink-soft)" />
      <span className="min-w-0 flex-1 truncate">{etiqueta}</span>
      {detalle ? (
        <span className="shrink-0 font-mono text-(length:--text-xs) text-(--color-ink-faint)">
          {detalle}
        </span>
      ) : null}
    </Button>
  )
}
