'use client'

import type { Route } from 'next'
import { RUTAS } from '@/shared/lib/rutas'
import { cn } from 'cn'

// «Ver <título> en Vehículos»: la ficha del vehículo en otra pestaña, para no perder la cotización a medio hacer. Un enlace propio, hermano del botón que elige: no elige ni cierra el panel.
// De 44 px de toque (en escritorio, 36).
export function VerLaFicha({
  id,
  titulo,
  className,
}: {
  id: string
  titulo: string
  className?: string
}) {
  return (
    // Un `<a>` plano: `target="_blank"` no navega con el router.
    <a
      href={`${RUTAS.vehiculos}/${id}` as Route}
      target="_blank"
      rel="noopener"
      aria-label={`Ver ${titulo} en Vehículos`}
      className={cn(
        'flex size-11 shrink-0 items-center justify-center rounded-(--radius-md) text-(length:--text-base) leading-none text-(--color-ink-soft) outline-none hover:bg-(--color-surface-3) hover:text-(--color-ink) focus-visible:shadow-(--shadow-focus) md:size-9',
        className,
      )}
    >
      {/* Un glifo y no un icono de trazos: veinte tarjetas son nodos del DOM (`e2e/cotizar-panel-del-vehiculo.spec.ts`). */}
      ↗
    </a>
  )
}
