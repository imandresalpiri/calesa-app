'use client'

import type { KeyboardEvent } from 'react'
import type { Direccion } from '../../../entities/diseno/mover-en-la-rejilla'

type Acciones = {
  // Alt+flechas: una celda en esa dirección (una avanzada, un lugar de su lista; el bloque «Avanzado», una fila).
  alMover: (direccion: Direccion) => void
  // Alt+Shift+← / →: una columna menos o más (nulo: no cambia de ancho por teclado, una sección o el bloque).
  alCambiarAncho: ((paso: -1 | 1) => void) | null
  // Esc con la pieza elegida: la suelta.
  alSoltar: (() => void) | null
}

const DIRECCIONES: Readonly<Record<string, Direccion>> = {
  ArrowLeft: 'izquierda',
  ArrowRight: 'derecha',
  ArrowUp: 'arriba',
  ArrowDown: 'abajo',
}

// Las teclas del botón de una pieza del lienzo. Sólo con el foco en el botón mismo (`e.target === e.currentTarget`): lo que se tipea en otro lado no mueve nada.
export function useTeclasDeLaPieza({ alMover, alCambiarAncho, alSoltar }: Acciones) {
  return (e: KeyboardEvent<HTMLElement>) => {
    if (e.target !== e.currentTarget) return
    if (e.key === 'Escape' && alSoltar !== null) {
      e.preventDefault()
      alSoltar()
      return
    }
    const direccion = DIRECCIONES[e.key]
    if (!e.altKey || direccion === undefined) return
    if (!e.shiftKey) {
      e.preventDefault()
      alMover(direccion)
      return
    }
    if (alCambiarAncho === null || direccion === 'arriba' || direccion === 'abajo') return
    e.preventDefault()
    alCambiarAncho(direccion === 'izquierda' ? -1 : 1)
  }
}
