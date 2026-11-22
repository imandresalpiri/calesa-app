'use client'

import { InfoIcon, XIcon } from 'lucide-react'

// El aviso de la primera vez que se pisa un cálculo (`docs/COTIZADOR.md` › «Pisar un cálculo»): en línea, sobre las secciones, sin frenar nada. Sin rol propio: lo
// anuncia la región viva que lo contiene (`RegionDelAvisoDePisado`), que ya estaba en la página cuando llega.
export function AvisoDePisado({ alCerrar }: { alCerrar: () => void }) {
  return (
    <div
      data-aviso-de-pisado=""
      className="flex items-start gap-2 rounded-(--radius-md) bg-(--color-info-soft) py-1 pr-1 pl-3 text-(length:--text-sm) text-(--color-info-ink)"
    >
      <InfoIcon aria-hidden className="mt-2.5 size-4 shrink-0" />
      <p className="min-w-0 flex-1 py-1.5">
        Pisaste un cálculo: queda fijo aunque cambien los datos.{' '}
        <span role="img" aria-label="Volver al calculado">
          ↺
        </span>{' '}
        lo devuelve.
      </p>
      <button
        type="button"
        aria-label="Cerrar el aviso"
        onClick={alCerrar}
        className="flex size-[44px] shrink-0 items-center justify-center rounded-(--radius-md) outline-none hover:bg-(--color-surface-3) focus-visible:shadow-(--shadow-focus) md:size-8"
      >
        <XIcon aria-hidden className="size-4" />
      </button>
    </div>
  )
}
