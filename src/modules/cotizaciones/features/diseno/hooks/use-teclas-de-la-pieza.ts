'use client'

import type { KeyboardEvent } from 'react'

type Acciones = {
  // Alt+← / Alt+→: una columna menos o más (nulo: la pieza no cambia de ancho, una sección).
  alCambiarAncho: ((paso: -1 | 1) => void) | null
  // Alt+↑ / Alt+↓: un lugar antes o después (cruza a la sección vecina).
  alMover: (paso: -1 | 1) => void
  // Esc con la pieza elegida: la suelta.
  alSoltar: (() => void) | null
}

const PASOS: Readonly<Record<string, -1 | 1>> = {
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -1,
  ArrowDown: 1,
}

// Las teclas del botón de una pieza del lienzo. Sólo con el foco en el botón mismo (`e.target === e.currentTarget`): lo que se tipea en otro lado no mueve nada.
export function useTeclasDeLaPieza({ alCambiarAncho, alMover, alSoltar }: Acciones) {
  return (e: KeyboardEvent<HTMLElement>) => {
    if (e.target !== e.currentTarget) return
    if (e.key === 'Escape' && alSoltar !== null) {
      e.preventDefault()
      alSoltar()
      return
    }
    const paso = PASOS[e.key]
    if (!e.altKey || paso === undefined) return
    const horizontal = e.key === 'ArrowLeft' || e.key === 'ArrowRight'
    if (horizontal && alCambiarAncho === null) return
    e.preventDefault()
    if (horizontal) alCambiarAncho?.(paso)
    else alMover(paso)
  }
}
