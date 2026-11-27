'use client'

import type { KeyboardEvent, RefObject } from 'react'

const botones = (lista: HTMLElement) => [
  ...lista.querySelectorAll<HTMLButtonElement>('button[data-nodo]'),
]

// El teclado de la cadena (un solo Tab la cruza): ← y → llevan el foco al nodo de al lado, Inicio y Fin a los extremos. Mover el foco no elige: elegir es Enter o Espacio
// (el botón), así recorrer la cadena no pide una lectura por tecla.
export function useTecladoDeLaCadena(lista: RefObject<HTMLElement | null>) {
  return (evento: KeyboardEvent<HTMLElement>) => {
    const raiz = lista.current
    if (!raiz) return
    const todos = botones(raiz)
    const actual = todos.findIndex((b) => b === document.activeElement)
    if (actual < 0) return
    const destino = {
      ArrowRight: Math.min(actual + 1, todos.length - 1),
      ArrowLeft: Math.max(actual - 1, 0),
      Home: 0,
      End: todos.length - 1,
    }[evento.key]
    if (destino === undefined) return
    evento.preventDefault()
    for (const [i, b] of todos.entries()) b.tabIndex = i === destino ? 0 : -1
    todos[destino]?.focus()
  }
}
