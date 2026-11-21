'use client'

import { ChevronDownIcon, XIcon } from 'lucide-react'
import { useId } from 'react'
import { cn } from 'cn'

export type OpcionDeChip = { valor: string; etiqueta: string }

type Props = {
  etiqueta: string
  // Lo que dice sin filtro («Todas», «Todos»).
  todas: string
  opciones: readonly OpcionDeChip[]
  // El valor elegido; nulo sin filtro.
  valor: string | null
  alElegir: (valor: string | null) => void
}

const SIN_FILTRO = ''

// Un filtro de una sola opción como chip: «Persona: Todas ▾». Elegido, se resalta y lleva su «×». Un `<select>` nativo: la lista del sistema
// en el celular, el teclado de siempre y ningún código de más.
export function ChipDeEleccion({ etiqueta, todas, opciones, valor, alElegir }: Props) {
  const id = useId()
  const elegida = valor === null ? null : opciones.find((o) => o.valor === valor)
  const activo = elegida !== null && elegida !== undefined
  return (
    <div
      className={cn(
        'inline-flex max-w-full min-w-0 items-center rounded-full border text-(length:--text-sm)',
        activo
          ? 'border-(--color-primario) bg-(--color-primario-soft) text-(--color-primario-ink)'
          : 'border-(--color-line-strong) bg-(--color-surface) text-(--color-ink)',
      )}
    >
      <label htmlFor={id} className="shrink-0 pl-3 text-(--color-ink-soft)">
        {etiqueta}
      </label>
      <span aria-hidden className="text-(--color-ink-soft)">
        :
      </span>
      <span className="relative flex min-w-0 items-center">
        <select
          id={id}
          value={activo ? elegida.valor : SIN_FILTRO}
          onChange={(evento) => {
            alElegir(evento.target.value === SIN_FILTRO ? null : evento.target.value)
          }}
          className="min-h-11 max-w-56 min-w-0 cursor-pointer appearance-none truncate rounded-full bg-transparent py-0 pr-7 pl-1 font-medium outline-none focus-visible:shadow-(--shadow-focus) md:min-h-9"
        >
          <option value={SIN_FILTRO}>{todas}</option>
          {opciones.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.etiqueta}
            </option>
          ))}
        </select>
        <ChevronDownIcon
          aria-hidden
          className="pointer-events-none absolute right-2 size-3.5 text-(--color-ink-faint)"
        />
      </span>
      {activo ? (
        <button
          type="button"
          aria-label={`Quitar el filtro ${etiqueta}: ${elegida.etiqueta}`}
          className="grid min-h-11 min-w-11 shrink-0 place-items-center rounded-full outline-none hover:bg-(--color-paper-dim) focus-visible:shadow-(--shadow-focus) md:min-h-9 md:min-w-9"
          onClick={() => {
            alElegir(null)
          }}
        >
          <XIcon aria-hidden className="size-3.5" />
        </button>
      ) : null}
    </div>
  )
}
