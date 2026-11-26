'use client'

import { applyNodeChanges, type NodeChange } from '@xyflow/react'
import { useCallback, useRef, useState } from 'react'
import type { NodoDeFase } from './datos-del-diagrama'

// Las cajas en estado (React Flow las mueve al arrastrar, libres y en la rejilla). Vuelven a las de `base` (lo leído con lo pendiente encima) cuando ésta
// cambia, salvo con un arrastre en curso: lo que llega a mitad de un arrastre (la relectura de otra escritura) no tira la caja de la mano. `vieneDeArrastrar`
// dice si el `mouseup` que sigue todavía es del arrastre (no abre la fase).
export function useCajasDelLienzo(base: NodoDeFase[]) {
  const [nodos, setNodos] = useState(base)
  const [deLaBase, setDeLaBase] = useState(base)
  const [arrastrando, setArrastrando] = useState(false)
  const arrastro = useRef(false)
  if (deLaBase !== base && !arrastrando) {
    setDeLaBase(base)
    setNodos(base)
  }
  const alCambiar = useCallback((cambios: NodeChange<NodoDeFase>[]) => {
    setNodos((actuales) => applyNodeChanges(cambios, actuales))
  }, [])
  const vieneDeArrastrar = useCallback(() => arrastro.current, [])
  return {
    nodos,
    alCambiar,
    vieneDeArrastrar,
    alEmpezar: () => {
      arrastro.current = true
      setArrastrando(true)
    },
    alSoltar: () => {
      setArrastrando(false)
      // El clic que sigue al soltar todavía viene del arrastre.
      setTimeout(() => {
        arrastro.current = false
      }, 0)
    },
  }
}
