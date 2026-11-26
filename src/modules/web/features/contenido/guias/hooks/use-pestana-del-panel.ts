'use client'

import { parseAsStringLiteral, useQueryState } from 'nuqs'

export const PESTANAS_DEL_PANEL = ['publicacion', 'bloque'] as const
export type PestanaDelPanel = (typeof PESTANAS_DEL_PANEL)[number]

// La pestaña del panel de la guía en la URL (`?pestana=bloque`): se recarga igual y se comparte. Cambiar de pestaña reemplaza la entrada del
// historial (no suma una por clic).
export function usePestanaDelPanel() {
  const [pestana, poner] = useQueryState(
    'pestana',
    parseAsStringLiteral(PESTANAS_DEL_PANEL).withDefault('publicacion').withOptions({
      history: 'replace',
    }),
  )
  return [pestana, (nueva: PestanaDelPanel) => void poner(nueva)] as const
}
