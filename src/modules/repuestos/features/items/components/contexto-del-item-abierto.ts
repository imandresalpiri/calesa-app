'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { FilaDeItem } from '../../../entities/nucleo/item'
import type { ContextoDeLaHoja } from './contexto-de-la-hoja'

// Lo que el panel del ítem de la hoja le da a su columna izquierda, que dibuja el servidor dentro del panel y por eso no lo recibe por props: la fila viva de la hoja (se edita sin releer),
// su contexto de guardado, el aviso de conflicto y el botón del siguiente. Fuera del panel de la hoja (la Cadena) no hay contexto y la columna lee lo que le manda el servidor.
export type ItemAbiertoEnLaHoja = {
  // Nula si el ítem no está entre las filas de la hoja (otro proyecto por URL, o más allá del tope): el panel dice sólo lo que lee el servidor.
  fila: FilaDeItem | null
  contexto: ContextoDeLaHoja
  cerrado: boolean
  conflicto: string | null
  alRecargar: () => void
  // El botón del siguiente (o «Sigue: «X»»); nada si el flujo no se pudo leer.
  paso: ReactNode
}

export const ContextoDelItemAbierto = createContext<ItemAbiertoEnLaHoja | null>(null)

export function useItemAbiertoEnLaHoja(): ItemAbiertoEnLaHoja | null {
  return useContext(ContextoDelItemAbierto)
}
