'use client'

import { PlusIcon } from 'lucide-react'
import { useId } from 'react'

type Props = {
  // Por qué no se agrega (el tope o sólo lectura); nulo: se puede.
  motivo: string | null
  alAgregar: () => void
}

// «+» de la tira de páginas: una página en blanco después de la elegida. Apagado, dice por qué en el `title` y al lector de pantalla.
export function BotonDeAgregarPagina({ motivo, alAgregar }: Props) {
  const id = useId()
  const apagado = motivo !== null
  return (
    <>
      <button
        type="button"
        aria-label="Agregar página"
        aria-disabled={apagado}
        aria-describedby={apagado ? id : undefined}
        title={motivo ?? 'Agregar página'}
        onClick={() => {
          if (!apagado) {
            alAgregar()
          }
        }}
        className="inline-flex size-7 shrink-0 items-center justify-center rounded-(--radius-sm) text-(--color-ink-soft) transition outline-none hover:bg-(--color-surface-3) hover:text-(--color-ink) focus-visible:shadow-(--shadow-focus) aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:bg-transparent"
      >
        <PlusIcon aria-hidden className="size-4" />
      </button>
      {apagado ? (
        <span id={id} className="sr-only">
          {motivo}
        </span>
      ) : null}
    </>
  )
}
