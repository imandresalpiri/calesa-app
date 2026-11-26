'use client'

import { useMemo, useState, type ReactNode } from 'react'
import type { EstadoDeLaEdicion } from '../../../entities/estado-de-la-edicion'
import { ContextoDeLaBarra } from './contexto'

// El proveedor de la barra de la fórmula: envuelve la barra y la pestaña abierta (Planilla, Hoja o Tarjeta) para que el editor lleve sus
// botones a la barra (`<AccionesEnLaBarra>`) y le diga su estado (`useEstadoEnLaBarra()`).
export function ConLaBarraDeLaFormula({ children }: { children: ReactNode }) {
  const [ranura, setRanura] = useState<HTMLElement | null>(null)
  const [ranuraDelEstado, setRanuraDelEstado] = useState<HTMLElement | null>(null)
  const [estado, registrarEstado] = useState<EstadoDeLaEdicion>(null)
  const contexto = useMemo(
    () => ({ ranura, setRanura, ranuraDelEstado, setRanuraDelEstado, estado, registrarEstado }),
    [ranura, ranuraDelEstado, estado],
  )
  return <ContextoDeLaBarra value={contexto}>{children}</ContextoDeLaBarra>
}
