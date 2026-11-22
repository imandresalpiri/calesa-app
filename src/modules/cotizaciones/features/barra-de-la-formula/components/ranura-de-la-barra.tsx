'use client'

import { useContextoDeLaBarra } from './contexto'

// El lugar de la barra de la fórmula donde el editor de la pestaña pone sus botones («Guardar el borrador», «Publicar…», «⋯»), en su `orden`.
export function RanuraDeLaBarra() {
  const contexto = useContextoDeLaBarra()
  return (
    <div
      ref={contexto?.setRanura}
      data-ranura-de-la-barra=""
      className="flex min-w-0 flex-wrap items-center justify-end gap-2 empty:hidden"
    />
  )
}
