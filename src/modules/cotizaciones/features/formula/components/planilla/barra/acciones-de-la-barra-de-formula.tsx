'use client'

import { TiposDeCelda } from '../menu/tipos-de-celda'

// 44 px en una pantalla táctil.
export const BOTON_DE_LA_BARRA =
  'flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-(--radius-md) border border-(--color-line) px-3 text-(length:--text-sm) text-(--color-ink) outline-none hover:bg-(--color-surface-3) focus-visible:shadow-(--shadow-focus) aria-expanded:bg-(--color-surface-3) md:pointer-fine:min-h-9 md:pointer-fine:min-w-9'

// A la derecha de la barra de fórmula: «?» (los tipos de celda).
export function AccionesDeLaBarraDeFormula() {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <TiposDeCelda className={BOTON_DE_LA_BARRA} />
    </div>
  )
}
