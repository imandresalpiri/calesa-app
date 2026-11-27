'use client'

import { useRef, type ReactNode } from 'react'
import { PistaDeDesborde } from '@/shared/ui/pista-de-desborde'
import { useDesborde } from '@/shared/ui/use-desborde'

type Props = {
  // El nombre de la barra para el lector («Logística de <origen>»).
  nombre: string
  children: ReactNode
}

// La segunda fila de la barra de Logística (las pestañas del origen, que arma el servidor): si no caben, se desplaza dentro de su ancho y dice por dónde sigue,
// como la fila de orígenes.
export function FilaConDesborde({ nombre, children }: Props) {
  const fila = useRef<HTMLDivElement>(null)
  const desborde = useDesborde(fila)
  return (
    <nav aria-label={nombre} className="relative h-full min-w-0 flex-1">
      <div ref={fila} className="flex h-full items-center gap-1 overflow-x-auto overflow-y-hidden">
        {children}
      </div>
      <PistaDeDesborde {...desborde} />
    </nav>
  )
}
