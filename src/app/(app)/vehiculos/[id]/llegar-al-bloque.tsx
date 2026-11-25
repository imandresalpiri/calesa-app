'use client'

import { useIrAlLlegar } from '@/shared/ui/ficha-en-bloques'
import type { AnclaDeLaFicha } from './bloques'

// Al llegar con `?seccion=<bloque>` o con un panel de «Relacionados», lleva la página a ese bloque (`anclaDeLaUrl`).
export function LlegarAlBloque({ ancla }: { ancla: AnclaDeLaFicha | null }) {
  useIrAlLlegar(ancla)
  return null
}
