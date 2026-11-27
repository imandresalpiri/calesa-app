'use client'

import { createContext, use } from 'react'
import type { EstadoDeLaEdicion } from '../../../entities/estado-de-la-edicion'

// Lo que la barra de la fórmula (docs/GLOSARIO.md › «Barra de la fórmula») comparte con los editores de Planilla, Hoja y Tarjeta: los lugares
// donde van sus botones (las acciones y, junto al estado, la información) y el estado de lo que se edita.
export type ContextoDeLaBarra = {
  // El lugar de la barra donde van las acciones del editor; nulo hasta que la barra se montó.
  ranura: HTMLElement | null
  setRanura: (nodo: HTMLElement | null) => void
  // El lugar junto al estado (el botón ⓘ «Información de la fórmula» de la Planilla); nulo hasta que se montó.
  ranuraDelEstado: HTMLElement | null
  setRanuraDelEstado: (nodo: HTMLElement | null) => void
  estado: EstadoDeLaEdicion
  registrarEstado: (estado: EstadoDeLaEdicion) => void
}

export const ContextoDeLaBarra = createContext<ContextoDeLaBarra | null>(null)

// El contexto de la barra; nulo fuera de ella (la puesta en marcha dibuja los mismos editores sin la barra).
export function useContextoDeLaBarra(): ContextoDeLaBarra | null {
  return use(ContextoDeLaBarra)
}

// ¿Esto se dibuja bajo la barra de la fórmula? Lo que se ofrece en la barra no se repite en el editor.
export function useEnLaBarra(): boolean {
  return use(ContextoDeLaBarra) !== null
}
