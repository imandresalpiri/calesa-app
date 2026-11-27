'use client'

import { createContext, use } from 'react'

// Lo que el resumen de una tarjeta (que llega después, del servidor) sabe del marco: su clave (para su aviso de «Qué falta») y abrir su drawer con las claves de URL de una acción y, al aparecer, enfocar algo
// adentro («Escribir una nota» → el campo de la nota). Fuera de una tarjeta no abre nada.
export type PedidoDeAbrir = {
  url?: Readonly<Record<string, string>>
  enfocar?: string
}

export type Tarjeta = { clave: string; abrir: (pedido?: PedidoDeAbrir) => void }

const ContextoDeLaTarjeta = createContext<Tarjeta>({ clave: '', abrir: () => undefined })

export const ProveedorDeLaTarjeta = ContextoDeLaTarjeta.Provider

export function useTarjeta(): Tarjeta {
  return use(ContextoDeLaTarjeta)
}
