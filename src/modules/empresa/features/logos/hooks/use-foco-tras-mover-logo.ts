'use client'

import { useEffect } from 'react'

// Tras mover una variante, el foco vuelve al «⋯» de su fila (la lista se redibuja): `movimiento` cambia en cada movimiento.
export function useFocoTrasMoverLogo(
  prefijo: string,
  movimiento: { id: string; veces: number } | null,
) {
  useEffect(() => {
    if (movimiento) {
      document.getElementById(`${prefijo}-${movimiento.id}-mas`)?.focus()
    }
  }, [prefijo, movimiento])
}
