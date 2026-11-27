'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { Share2Icon } from 'lucide-react'
import { RUTAS } from '@/shared/lib/rutas'
import { Button } from '@/shared/ui/button'

type Props = {
  puedeGestionar: boolean
  alCerrar: () => void
  // Compartir se ofrece con tipos a la vista: sin esto, no hay botón.
  alCompartir: (() => void) | null
  // Por qué «Compartir» está apagado (se está editando un valor), o null.
  motivoSinCompartir: string | null
}

// El pie del popover de tipos de cambio: las acciones sobre todos, a lo ancho y separadas de la lista. Compartirlos con un cliente y, para quien los
// gestiona, ir a configurarlos.
export function PieDelPopover({
  puedeGestionar,
  alCerrar,
  alCompartir,
  motivoSinCompartir,
}: Props) {
  if (!puedeGestionar && alCompartir === null) {
    return null
  }
  return (
    <div
      data-pie-del-popover=""
      className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-(--color-line) pt-2"
    >
      {alCompartir === null ? null : (
        <div className="grid gap-0.5">
          <Button
            type="button"
            variant="outline"
            className="h-11 md:h-9"
            disabled={motivoSinCompartir !== null}
            aria-describedby={motivoSinCompartir === null ? undefined : 'compartir-motivo'}
            onClick={alCompartir}
          >
            <Share2Icon aria-hidden />
            Compartir
          </Button>
          {motivoSinCompartir === null ? null : (
            <p id="compartir-motivo" className="text-(length:--text-xs) text-(--color-ink-faint)">
              {motivoSinCompartir}
            </p>
          )}
        </div>
      )}
      {puedeGestionar ? (
        <Link
          href={RUTAS.monedasDeEmpresa as Route}
          onClick={alCerrar}
          className="inline-flex min-h-11 items-center text-(length:--text-sm) font-medium text-(--color-primario-ink) underline-offset-4 outline-none hover:underline focus-visible:shadow-(--shadow-focus) md:min-h-0"
        >
          Configurar los tipos de cambio
        </Link>
      ) : null}
    </div>
  )
}
