'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { ContextoDeLaRanuraDeLaCabecera } from './contexto'

// Lo pone `src/app` sobre las barras y la hoja (fuera de la `key` de la hoja): la ranura vive en la fila de las barras y la hoja, que se vuelve a montar al elegir, pone su
// cabecera ahí. El lugar se guarda con un `ref` en el estado, nunca leyendo el DOM al dibujar.
export function ProveedorDeLaRanuraDeLaCabecera({ children }: { children: ReactNode }) {
  const [elemento, setElemento] = useState<HTMLElement | null>(null)
  const valor = useMemo(() => ({ poner: setElemento, elemento }), [elemento])
  return <ContextoDeLaRanuraDeLaCabecera value={valor}>{children}</ContextoDeLaRanuraDeLaCabecera>
}
