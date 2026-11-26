'use client'

import { createContext, use, type ReactNode } from 'react'

// El nivel de los bloques de afuera de un panel o una página: bajo su título, un `h2`.
export const NIVEL_DE_AFUERA = 3

// El nivel del encabezado que lleva un `<Bloque>`: 3 bajo el título de un panel (su `h2`), también sin proveedor; 4 si va dentro de otro bloque.
const ContextoDeBloquesALaVista = createContext<number>(NIVEL_DE_AFUERA)

export function useNivelDeBloque(): number {
  return use(ContextoDeBloquesALaVista)
}

type Props = { nivel?: number; children: ReactNode }

// Fija el nivel del encabezado de los `<Bloque>` de adentro. Cada `<Bloque>` lo baja uno para los suyos.
export function BloquesALaVista({ nivel = NIVEL_DE_AFUERA, children }: Props) {
  return <ContextoDeBloquesALaVista value={nivel}>{children}</ContextoDeBloquesALaVista>
}
