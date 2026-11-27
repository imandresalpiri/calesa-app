'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { useRef } from 'react'
import { PistaDeDesborde } from '@/shared/ui/pista-de-desborde'
import { useDesborde } from '@/shared/ui/use-desborde'

export type PestanaDeOrigen = {
  id: string
  nombre: string
  color: string | null
  href: string
}

type Props = {
  pestanas: readonly PestanaDeOrigen[]
  // El origen marcado; nulo cuando la página no es de ninguno de la lista (uno pedido que no se ve, la unidad de otro origen).
  actual: string | null
}

// La primera fila de la barra de Logística: una pestaña por origen, como en Vehículos. Nombres y colores salen de la fila del origen; cada `href` ya lo arma la página
// (la misma pestaña en el otro origen si la tiene; si no, su Cadena), sin filtros ni cursor: serían de otro origen. Se dibuja también con un solo origen (dice cuál es
// y la barra mide siempre lo mismo). Si no caben, se desplazan con la pista de que siguen. Alto fijo: el de `EsqueletoDeLaBarra`. La línea de abajo es una sombra y no un borde:
// un borde le quitaría 1 px a la pestaña, que en el celular tiene que medir 44.
export function PestanasDeOrigen({ pestanas, actual }: Props) {
  const lista = useRef<HTMLUListElement>(null)
  const desborde = useDesborde(lista)
  return (
    <nav
      aria-label="Orígenes"
      className="relative h-11 min-w-0 shadow-[inset_0_-1px_0_var(--color-line)] md:h-9"
    >
      <ul ref={lista} className="flex h-full gap-1 overflow-x-auto overflow-y-hidden">
        {pestanas.map((pestana) => (
          <li key={pestana.id} className="shrink-0">
            <Link
              href={pestana.href as Route}
              prefetch={false}
              aria-current={pestana.id === actual ? 'page' : undefined}
              className="flex h-full items-center gap-2 border-b-2 border-transparent px-3 text-(length:--text-sm) whitespace-nowrap text-(--color-ink-soft) outline-none hover:text-(--color-ink) focus-visible:shadow-(--shadow-focus) aria-[current=page]:border-(--color-primario) aria-[current=page]:font-medium aria-[current=page]:text-(--color-ink)"
            >
              {pestana.color ? (
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: pestana.color }}
                />
              ) : null}
              {pestana.nombre}
            </Link>
          </li>
        ))}
      </ul>
      <PistaDeDesborde {...desborde} />
    </nav>
  )
}
