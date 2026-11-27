'use client'

import { Checkbox } from '@/shared/ui/checkbox'
import type { OrigenDelLive } from '../../../entities/live-configuracion'

type Props = {
  origenes: readonly OrigenDelLive[]
  casillas: { todas: boolean; marcados: ReadonlySet<string>; apagadas: boolean }
  deshabilitado: boolean
  alMarcar: (id: string, marcado: boolean) => void
}

// Las casillas de «Orígenes», siempre a la vista (nada salta al cambiar de opción): con «Sólo estos» se marcan; con «Todos los orígenes activos» o lo
// heredado quedan apagadas y dicen qué vale. Los activos y, si están marcados, los inactivos con su aclaración.
export function CasillasDeOrigenes({ origenes, casillas, deshabilitado, alMarcar }: Props) {
  const visibles = origenes.filter((origen) => origen.activo || casillas.marcados.has(origen.id))
  if (visibles.length === 0) {
    return (
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">
        Todavía no hay orígenes activos.
      </p>
    )
  }
  return (
    <fieldset className="min-w-0">
      <legend className="sr-only">Los orígenes de «Sólo estos»</legend>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,12rem),1fr))] gap-x-4">
        {visibles.map((origen) => (
          <li key={origen.id} className="min-w-0">
            <label className="flex min-h-11 items-center gap-2 text-(length:--text-sm) text-(--color-ink) md:min-h-8">
              <Checkbox
                data-origen-del-live={origen.id}
                checked={casillas.todas || casillas.marcados.has(origen.id)}
                disabled={casillas.apagadas || deshabilitado}
                onCheckedChange={(marcado) => {
                  alMarcar(origen.id, marcado)
                }}
              />
              <span className="min-w-0 break-words">
                {origen.activo ? origen.nombre : `${origen.nombre} (inactivo)`}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  )
}
