'use client'

import { createContext, use } from 'react'

// Lo que el resumen de una tarjeta (que llega después, del servidor) le pide al marco: abrir su drawer con las claves de URL de una acción y, al aparecer, enfocar algo
// adentro («Escribir una nota» → el campo de la nota). Fuera de una tarjeta no abre nada.
export type PedidoDeAbrir = {
  url?: Readonly<Record<string, string>>
  enfocar?: string
}

const ContextoDeLaTarjeta = createContext<(pedido?: PedidoDeAbrir) => void>(() => undefined)

export const ProveedorDeLaTarjeta = ContextoDeLaTarjeta.Provider

export function useAbrirLaTarjeta(): (pedido?: PedidoDeAbrir) => void {
  return use(ContextoDeLaTarjeta)
}
