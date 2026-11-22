'use client'

import { useEffect } from 'react'
import type { Direccion } from './tipos'

export type Movimiento = { id: string; direccion: Direccion; veces: number }

// Tras mover, el foco sigue en el botón de esa fila (la fila cambia de lugar); si llegó al extremo y ese botón se apagó, pasa al otro. Los botones se
// encuentran por su `id` (`<BotonesDeOrden prefijo>`). Una lista que ordena desde el «⋯» de la fila (`<ListaDeCatalogo>`) no tiene esos botones: el foco
// vuelve al «⋯» de la fila movida (`data-mas-acciones="<prefijo>-<id>-mas"`).
export function useFocoTrasMover(prefijo: string, movimiento: Movimiento | null) {
  useEffect(() => {
    if (!movimiento) {
      return
    }
    const lado = movimiento.direccion
    const propio = document.getElementById(`${prefijo}-${movimiento.id}-${lado}`)
    const otro = document.getElementById(
      `${prefijo}-${movimiento.id}-${lado === 'subir' ? 'bajar' : 'subir'}`,
    )
    const delMenu = document.querySelector(`[data-mas-acciones="${prefijo}-${movimiento.id}-mas"]`)
    const destino =
      propio instanceof HTMLButtonElement && !propio.disabled ? propio : (otro ?? delMenu)
    if (destino instanceof HTMLElement) {
      destino.focus()
    }
  }, [prefijo, movimiento])
}
