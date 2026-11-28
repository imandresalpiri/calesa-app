'use client'

import type { KeyboardEvent } from 'react'
import {
  PESTANAS_DEL_PANEL_IZQUIERDO,
  TITULOS_DEL_PANEL_IZQUIERDO,
  type PestanaIzquierda,
} from '../../../entities/editor/paneles'

const FLECHAS: Readonly<Record<string, number>> = { ArrowLeft: -1, ArrowRight: 1 }

type Props = {
  pestana: PestanaIzquierda
  alCambiarPestana: (pestana: PestanaIzquierda) => void
  // Los ids de cada pestaña y de su panel (los arma el panel izquierdo).
  idDe: (pestana: PestanaIzquierda, que: 'pestana' | 'panel') => string
}

// Las pestañas «Agregar» y «Capas» del panel izquierdo, en una fila de 40 px. Con el teclado, ← y → cambian de pestaña; la flecha llega a los
// atajos del editor con `defaultPrevented`.
export function PestanasDelPanelIzquierdo({ pestana, alCambiarPestana, idDe }: Props) {
  function alTeclear(evento: KeyboardEvent<HTMLButtonElement>) {
    const paso = FLECHAS[evento.key]
    if (paso === undefined) {
      return
    }
    evento.preventDefault()
    const i = PESTANAS_DEL_PANEL_IZQUIERDO.indexOf(pestana)
    const total = PESTANAS_DEL_PANEL_IZQUIERDO.length
    const otra = PESTANAS_DEL_PANEL_IZQUIERDO[(i + paso + total) % total] ?? pestana
    alCambiarPestana(otra)
    document.getElementById(idDe(otra, 'pestana'))?.focus()
  }

  return (
    <div
      role="tablist"
      aria-label="Panel izquierdo"
      className="flex h-10 shrink-0 items-stretch gap-1 border-b border-(--color-line) px-2"
    >
      {PESTANAS_DEL_PANEL_IZQUIERDO.map((p) => (
        <button
          key={p}
          type="button"
          role="tab"
          id={idDe(p, 'pestana')}
          aria-selected={p === pestana}
          aria-controls={idDe(p, 'panel')}
          tabIndex={p === pestana ? 0 : -1}
          onClick={() => {
            alCambiarPestana(p)
          }}
          onKeyDown={alTeclear}
          className="relative inline-flex items-center px-2 text-(length:--text-sm) font-medium text-(--color-ink-soft) transition outline-none after:absolute after:inset-x-1 after:bottom-0 after:h-0.5 after:rounded-full hover:text-(--color-ink) focus-visible:shadow-(--shadow-focus) aria-selected:text-(--color-ink) aria-selected:after:bg-(--color-primario)"
        >
          {TITULOS_DEL_PANEL_IZQUIERDO[p]}
        </button>
      ))}
    </div>
  )
}
