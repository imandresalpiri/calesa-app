'use client'

import { useRef, type ReactNode } from 'react'
import { ATRIBUTO_DEL_BLOQUE, useAlPedirAbrirElHueco } from '../hooks/eventos-de-la-unidad'

const QUE_FALTA = 'que-falta'

// «Qué falta» en la página de la unidad: siempre a la vista (al costado en escritorio, arriba de las tarjetas en el celular), con su desplazamiento propio. Su ancla existe desde
// el primer render; «Mover» de la barra del celular la pide (`abrirHueco('que-falta')`) y ésta se trae a la vista y toma el foco. El título es visual, no un encabezado: adentro,
// cada destino es un `h3`.
export function ColumnaDeQueFalta({ titulo, children }: { titulo: string; children: ReactNode }) {
  const raiz = useRef<HTMLElement>(null)
  useAlPedirAbrirElHueco(QUE_FALTA, () => {
    raiz.current?.scrollIntoView({ block: 'nearest' })
    raiz.current?.focus()
  })
  return (
    <section
      ref={raiz}
      data-zona="principal"
      aria-labelledby="titulo-de-que-falta"
      tabIndex={-1}
      className="min-h-0 overflow-y-auto rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-3 outline-none focus-visible:shadow-(--shadow-focus)"
    >
      <p
        id="titulo-de-que-falta"
        className="mb-2 text-(length:--text-sm) font-medium text-(--color-ink-soft)"
      >
        {titulo}
      </p>
      <div {...{ [ATRIBUTO_DEL_BLOQUE]: QUE_FALTA }} className="min-w-0">
        {children}
      </div>
    </section>
  )
}
