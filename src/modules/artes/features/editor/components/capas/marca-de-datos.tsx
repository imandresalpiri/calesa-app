'use client'

import { DatabaseIcon } from 'lucide-react'

// Con datos: la capa se llena con el vehículo de ejemplo (un icono; el lector de pantalla lo oye). Sin datos: con el elegido no hay qué
// mostrar y no se dibuja en el lienzo (se sigue eligiendo).
export type DatosDeLaFila = 'con' | 'sin'

export function MarcaDeDatos({ datos }: { datos: DatosDeLaFila }) {
  if (datos === 'sin') {
    return (
      <span
        data-marca-de-datos="sin"
        className="shrink-0 text-(length:--text-xs) text-(--color-ink-faint)"
      >
        Sin datos
      </span>
    )
  }
  return (
    <span data-marca-de-datos="con" title="Con datos" className="shrink-0 text-(--color-ink-soft)">
      <DatabaseIcon aria-hidden className="size-3.5" />
      <span className="sr-only">Con datos</span>
    </span>
  )
}
