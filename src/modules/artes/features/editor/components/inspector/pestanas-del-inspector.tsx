'use client'

import type { KeyboardEvent } from 'react'
import {
  PESTANAS_DEL_PANEL_DERECHO,
  TITULOS_DEL_PANEL_DERECHO,
  type PestanaDerecha,
} from '../../../../entities/editor/paneles'

const FLECHAS: Readonly<Record<string, number>> = { ArrowLeft: -1, ArrowRight: 1 }

type Props = {
  pestana: PestanaDerecha
  alCambiar: (pestana: PestanaDerecha) => void
  idDe: (pestana: PestanaDerecha, que: 'pestana' | 'panel') => string
}

// La fila de 40 px del inspector: «Diseño» y «Textos», como las del panel izquierdo. Con el teclado, ← y → cambian de pestaña (la flecha
// llega a los atajos del editor con `defaultPrevented`).
export function PestanasDelInspector({ pestana, alCambiar, idDe }: Props) {
  function alTeclear(evento: KeyboardEvent<HTMLButtonElement>) {
    const paso = FLECHAS[evento.key]
    if (paso === undefined) {
      return
    }
    evento.preventDefault()
    const i = PESTANAS_DEL_PANEL_DERECHO.indexOf(pestana)
    const total = PESTANAS_DEL_PANEL_DERECHO.length
    const otra = PESTANAS_DEL_PANEL_DERECHO[(i + paso + total) % total] ?? pestana
    alCambiar(otra)
    document.getElementById(idDe(otra, 'pestana'))?.focus()
  }
  return (
    <div
      role="tablist"
      aria-label="Inspector"
      className="flex h-10 shrink-0 items-stretch gap-1 border-b border-(--color-line) px-2"
    >
      {PESTANAS_DEL_PANEL_DERECHO.map((p) => (
        <button
          key={p}
          type="button"
          role="tab"
          id={idDe(p, 'pestana')}
          aria-selected={p === pestana}
          aria-controls={idDe(p, 'panel')}
          tabIndex={p === pestana ? 0 : -1}
          onClick={() => {
            alCambiar(p)
          }}
          onKeyDown={alTeclear}
          className="relative inline-flex items-center px-2 text-(length:--text-sm) font-medium text-(--color-ink-soft) transition outline-none after:absolute after:inset-x-1 after:bottom-0 after:h-0.5 after:rounded-full hover:text-(--color-ink) focus-visible:shadow-(--shadow-focus) aria-selected:text-(--color-ink) aria-selected:after:bg-(--color-primario)"
        >
          {TITULOS_DEL_PANEL_DERECHO[p]}
        </button>
      ))}
    </div>
  )
}
