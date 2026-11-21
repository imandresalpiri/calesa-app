'use client'

import { useRef } from 'react'
import { ALTO_MAXIMO, ALTO_MINIMO, altoConTecla, altoDesdePuntero } from '../lib/alto-del-panel'

type Props = {
  // El alto de hoy, en % de la ventana.
  alto: number
  alCambiar: (alto: number) => void
}

// El asa de un `<Drawer alto="ajustable">`: una barra arriba del panel que se arrastra con el puntero o se mueve con ↑/↓ (de 5 en 5), Inicio y Fin. Sólo desde `md:` (en el celular el
// panel ocupa toda la pantalla). Un `role="separator"` enfocable es el patrón de ARIA para un divisor que se mueve.
export function AsaDelPanel({ alto, alCambiar }: Props) {
  const arrastrando = useRef(false)
  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      aria-label="Cambiar el alto del panel"
      aria-valuenow={alto}
      aria-valuemin={ALTO_MINIMO}
      aria-valuemax={ALTO_MAXIMO}
      tabIndex={0}
      className="hidden h-4 shrink-0 cursor-row-resize touch-none items-center justify-center outline-none focus-visible:shadow-(--shadow-focus) md:flex"
      onPointerDown={(evento) => {
        arrastrando.current = true
        evento.currentTarget.setPointerCapture(evento.pointerId)
      }}
      onPointerMove={(evento) => {
        if (arrastrando.current) alCambiar(altoDesdePuntero(evento.clientY, window.innerHeight))
      }}
      onPointerUp={(evento) => {
        arrastrando.current = false
        evento.currentTarget.releasePointerCapture(evento.pointerId)
      }}
      onKeyDown={(evento) => {
        const nuevo = altoConTecla(alto, evento.key)
        if (nuevo === null) return
        evento.preventDefault()
        alCambiar(nuevo)
      }}
    >
      <span aria-hidden className="h-1 w-10 rounded-full bg-(--color-line-strong)" />
    </div>
  )
}
