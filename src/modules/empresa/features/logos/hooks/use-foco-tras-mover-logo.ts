'use client'

import { useEffect } from 'react'

// Tras mover una variante desde el «⋯», el foco vuelve a él (la lista se redibuja): `movimiento` cambia en cada movimiento. Si el foco ya está en
// la fila movida (movida con ↑ y ↓ desde su asa), se queda donde está.
export function useFocoTrasMoverLogo(
  prefijo: string,
  movimiento: { id: string; veces: number } | null,
) {
  useEffect(() => {
    if (movimiento) {
      const fila = document.activeElement?.closest('li[data-logo]')
      if (fila?.getAttribute('data-logo') !== movimiento.id) {
        document.getElementById(`${prefijo}-${movimiento.id}-mas`)?.focus()
      }
    }
  }, [prefijo, movimiento])
}
