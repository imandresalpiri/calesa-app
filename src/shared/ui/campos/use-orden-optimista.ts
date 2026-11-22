'use client'

import { useOptimistic, useTransition } from 'react'
import { aplicarMovimiento, type CampoBase } from '@/shared/lib/campos'
import type { Resultado } from '@/shared/lib/errores'
import type { DeLaFila } from './tipos'

type Movimiento = { id: string; despuesDe: string | null }

// El orden se ve en su lugar nuevo apenas se suelta (o se elige «Subir»); si la base lo rechaza, vuelve solo al de lo guardado. Mientras
// viaja, `moviendo`: nada más se mueve (cada movimiento manda la versión que vio).
export function useOrdenOptimista<Campo extends CampoBase>(
  campos: readonly Campo[],
  mover: (campo: DeLaFila, despuesDe: string | null) => Promise<Resultado<unknown>>,
) {
  const [lista, aplicar] = useOptimistic(
    campos,
    (actual: readonly Campo[], movimiento: Movimiento) =>
      aplicarMovimiento(actual, movimiento.id, movimiento.despuesDe),
  )
  const [moviendo, empezar] = useTransition()
  return {
    lista,
    moviendo,
    mover: (campo: DeLaFila, despuesDe: string | null) => {
      empezar(async () => {
        aplicar({ id: campo.id, despuesDe })
        await mover(campo, despuesDe)
      })
    },
  }
}
