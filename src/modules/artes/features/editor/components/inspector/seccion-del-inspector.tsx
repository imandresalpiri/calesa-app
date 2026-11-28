'use client'

// Una sección del inspector del editor de artes: su título (`h3`), un detalle opcional a la derecha y su cuerpo, una grilla de una columna.
// No se pliega ni lleva otra sección adentro.
import { useId, type ReactNode } from 'react'

type Props = {
  titulo: string
  detalle?: string | null
  children: ReactNode
}

export function SeccionDelInspector({ titulo, detalle, children }: Props) {
  const id = useId()
  return (
    <section
      aria-labelledby={id}
      className="grid grid-cols-[minmax(0,1fr)] gap-3 border-b border-(--color-line) px-3 py-3"
    >
      <div className="flex min-h-5 items-baseline justify-between gap-2">
        <h3 id={id} className="text-(length:--text-sm) font-semibold text-(--color-ink)">
          {titulo}
        </h3>
        {detalle ? (
          <span className="truncate text-(length:--text-xs) text-(--color-ink-faint)">
            {detalle}
          </span>
        ) : null}
      </div>
      {children}
    </section>
  )
}
