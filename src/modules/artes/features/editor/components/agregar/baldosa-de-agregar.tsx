'use client'

import type { ReactNode } from 'react'

type Props = {
  etiqueta: string
  motivo: string | null
  alHacer: () => void
  // La vista previa (una caja de alto fijo: nada salta cuando la imagen llega o falla).
  children: ReactNode
}

// Una baldosa de la pestaña «Agregar» (un logo, una foto, la tarjeta, una imagen de la biblioteca): la vista previa y su nombre debajo, y un
// botón que la cubre entera y la agrega. Apagada sigue enfocable y dice su motivo en el título.
export function BaldosaDeAgregar({ etiqueta, motivo, alHacer, children }: Props) {
  return (
    <li className="group/baldosa relative grid min-w-0 grid-cols-[minmax(0,1fr)] gap-1">
      {children}
      <span className="truncate text-(length:--text-xs) text-(--color-ink-soft)">{etiqueta}</span>
      <button
        type="button"
        aria-label={`Agregar «${etiqueta}»`}
        aria-disabled={motivo !== null}
        title={motivo ?? etiqueta}
        onClick={() => {
          if (motivo === null) {
            alHacer()
          }
        }}
        className="absolute inset-0 rounded-(--radius-md) outline-none hover:bg-(--color-ink)/5 focus-visible:shadow-(--shadow-focus) aria-disabled:cursor-not-allowed aria-disabled:bg-(--color-surface)/50 aria-disabled:hover:bg-(--color-surface)/50"
      />
    </li>
  )
}
