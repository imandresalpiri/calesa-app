'use client'

import { createElement, useId, type ReactNode } from 'react'
import { cn } from 'cn'
import { BloquesALaVista, NIVEL_DE_AFUERA, useNivelDeBloque } from './bloques-a-la-vista'

type Props = {
  titulo: string
  descripcion?: string
  className?: string
  children: ReactNode
}

const CAJA = 'rounded-(--radius-card) border border-(--color-line) bg-(--color-surface)'
const CUERPO = 'grid grid-cols-[minmax(0,1fr)] gap-4'

// Una sección a la vista de un formulario o de un panel: una `<section>` con su encabezado (`h3` bajo el título del panel; enfocable con
// `tabIndex=-1` para llevarle el foco). Nunca se pliega: lo secundario va en un drawer o un modal con su URL (`.claude/rules/ui.md`). Los
// bloques de adentro bajan un nivel (`h4`, sin caja propia): sólo los usa el panel de una fase en Configuración.
export function Bloque({ titulo, descripcion, className, children }: Props) {
  const nivel = useNivelDeBloque()
  const id = useId()
  const anidado = nivel > NIVEL_DE_AFUERA
  const encabezado = createElement(
    `h${String(Math.min(nivel, 6))}`,
    {
      id,
      tabIndex: -1,
      className:
        'text-(length:--text-base) font-medium text-(--color-ink) outline-none focus-visible:shadow-(--shadow-focus)',
    },
    titulo,
  )
  return (
    <section
      data-slot="bloque"
      aria-labelledby={id}
      // El de afuera es una caja; los de adentro, sin caja propia (sólo una línea arriba): no queda una caja dentro de otra.
      className={cn(
        'grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3',
        anidado ? 'border-t border-(--color-line) pt-4 first:border-t-0 first:pt-0' : ['p-4', CAJA],
        className,
      )}
    >
      <div className="grid gap-0.5">
        {encabezado}
        {descripcion ? (
          <p className="text-(length:--text-sm) text-(--color-ink-soft)">{descripcion}</p>
        ) : null}
      </div>
      <div className={CUERPO}>
        <BloquesALaVista nivel={nivel + 1}>{children}</BloquesALaVista>
      </div>
    </section>
  )
}
