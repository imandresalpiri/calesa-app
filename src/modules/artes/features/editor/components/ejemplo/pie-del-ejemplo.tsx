'use client'

import { Loader2Icon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import type { LecturaDelEjemplo } from '../../hooks/use-lectura-del-ejemplo'

type Props = {
  lectura: LecturaDelEjemplo
  hayElegido: boolean
  reintentar: () => void
  soltar: () => void
}

// El pie del popover: lo que se está leyendo o lo que no llegó (con «Reintentar»; el lienzo sigue con lo último que tenía) en su renglón
// reservado y «Usar los datos de ejemplo», que suelta el vehículo elegido.
export function PieDelEjemplo({ lectura, hayElegido, reintentar, soltar }: Props) {
  return (
    <div className="grid gap-2 border-t border-(--color-line) pt-2">
      <p
        role="status"
        className="flex h-6 min-w-0 items-center gap-1.5 text-(length:--text-sm) text-(--color-ink-soft)"
      >
        {lectura.cargando ? (
          <>
            <Loader2Icon aria-hidden className="size-4 shrink-0 animate-spin" />
            <span className="truncate">Leyendo el vehículo…</span>
          </>
        ) : null}
        {!lectura.cargando && lectura.error !== null ? (
          <>
            <span className="min-w-0 truncate" title={lectura.error}>
              {lectura.error}
            </span>
            <Button type="button" variant="outline" size="xs" onClick={reintentar}>
              Reintentar
            </Button>
          </>
        ) : null}
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!hayElegido}
        onClick={soltar}
        className="justify-self-start"
      >
        Usar los datos de ejemplo
      </Button>
    </div>
  )
}
