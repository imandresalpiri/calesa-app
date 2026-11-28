'use client'

import { useId, type ReactNode, type Ref } from 'react'
import type { QueSeAgrega } from '../../../../entities/editor/capas-nuevas'

// Lo que recibe cada sección: por qué no se puede agregar (nulo si se puede) y cómo agregar.
export type PropsDeLaSeccion = {
  motivo: string | null
  alAgregar: (que: QueSeAgrega) => void
}

type Props = {
  titulo: string
  children: ReactNode
  // El título recibe el foco cuando alguien lleva a la persona hasta la sección (la biblioteca, desde «Imagen» del riel).
  refDelTitulo?: Ref<HTMLHeadingElement>
}

// Una sección de la pestaña «Agregar» del editor de artes: su título (`h3`) y debajo lo que agrega, en una grilla `minmax(0, 1fr)`. Las
// secciones van una debajo de otra, a la vista: ninguna se pliega ni lleva otra adentro.
export function SeccionDeAgregar({ titulo, children, refDelTitulo }: Props) {
  const id = useId()
  return (
    <section
      aria-labelledby={id}
      className="grid scroll-mt-2 grid-cols-[minmax(0,1fr)] gap-2 border-b border-(--color-line) px-3 py-3 last:border-b-0"
    >
      <h3
        id={id}
        ref={refDelTitulo}
        tabIndex={refDelTitulo ? -1 : undefined}
        className="text-(length:--text-sm) font-semibold text-(--color-ink) outline-none focus-visible:shadow-(--shadow-focus)"
      >
        {titulo}
      </h3>
      {children}
    </section>
  )
}
