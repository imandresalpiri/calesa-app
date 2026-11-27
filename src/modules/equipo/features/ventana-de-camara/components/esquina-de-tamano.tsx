'use client'

import type { HTMLAttributes } from 'react'
import type { EsquinaDeTamano as Esquina } from '../gesto'

type Props = {
  esquina: Esquina
  // Los manejadores de puntero y teclado (`useGestoDeLaVentana`).
  gesto: HTMLAttributes<HTMLButtonElement>
}

// La esquina por la que se cambia el tamaño: la que mira al centro de la pantalla. Con el puntero se arrastra; con el teclado, las flechas.
export function EsquinaDeTamano({ esquina, gesto }: Props) {
  const lado = esquina.aLaDerecha ? 'right-0 border-r-2' : 'left-0 border-l-2'
  const borde = esquina.abajo ? 'bottom-0 border-b-2' : 'top-9 border-t-2'
  const cursor = esquina.aLaDerecha === esquina.abajo ? 'cursor-nwse-resize' : 'cursor-nesw-resize'
  return (
    <button
      type="button"
      aria-label="Cambiar el tamaño de la ventana de cámara"
      title="Cambiar el tamaño"
      data-esquina-de-tamano=""
      {...gesto}
      className={`absolute z-10 size-3.5 touch-none border-(--color-ink-faint) opacity-70 outline-none hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-(--color-primario) ${lado} ${borde} ${cursor}`}
    />
  )
}
