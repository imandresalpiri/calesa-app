'use client'

import { createContext } from 'react'

// La ranura de la cabecera de la hoja (glosario: «Ranura de la cabecera»): el lugar, en la fila de las barras de arriba de la hoja, donde la hoja pone su cabecera (los
// modos, «Ver total en moneda local» y el ⚙) por un portal. `poner` es el `ref` del lugar (estable); `elemento`, el lugar ya montado (nulo mientras no).
export type RanuraDeLaCabecera = {
  poner: (elemento: HTMLElement | null) => void
  elemento: HTMLElement | null
}

export const ContextoDeLaRanuraDeLaCabecera = createContext<RanuraDeLaCabecera | null>(null)
