'use client'

import { useRef, useState, type PointerEvent as EventoDelPuntero } from 'react'
import { columnasPorBorde } from '../../../entities/diseno/ancho-de-la-pieza'

// El selector de la rejilla de la sección (`claseDeLaRejillaDeCeldas()`): el ancho de una columna sale de ella.
export const DE_LA_REJILLA = '[data-rejilla-de-celdas]'

// El borde derecho de la pieza elegida: arrastrarlo cambia su ancho en columnas de la rejilla (con «N/12» a la vista mientras se arrastra). Un solo cambio, al
// soltar; Esc cancela y deja el de antes. Mide en la pantalla (el lienzo escalado con `zoom` da medidas y puntero en la misma escala).
export function useAnchoConBorde(antes: number, alCambiar: (columnas: number) => void) {
  const [columnas, setColumnas] = useState<number | null>(null)
  const medida = useRef<{ inicio: number; ancho: number } | null>(null)
  const cancelar = () => {
    medida.current = null
    setColumnas(null)
  }
  return {
    // Mientras se arrastra, las columnas que quedarían; nulo, quieto.
    columnas,
    alBajar: (e: EventoDelPuntero<HTMLElement>) => {
      const pieza = e.currentTarget.parentElement?.getBoundingClientRect()
      const rejilla = e.currentTarget.closest(DE_LA_REJILLA)?.getBoundingClientRect()
      if (pieza === undefined || rejilla === undefined) return
      e.preventDefault()
      e.stopPropagation()
      e.currentTarget.setPointerCapture(e.pointerId)
      medida.current = { inicio: pieza.left, ancho: rejilla.width }
      setColumnas(antes)
    },
    alMover: (e: EventoDelPuntero<HTMLElement>) => {
      const m = medida.current
      if (m === null) return
      setColumnas(columnasPorBorde(e.clientX - m.inicio, m.ancho, antes))
    },
    alSubir: (e: EventoDelPuntero<HTMLElement>) => {
      const m = medida.current
      if (m === null) return
      const nuevas = columnasPorBorde(e.clientX - m.inicio, m.ancho, antes)
      cancelar()
      if (nuevas !== antes) alCambiar(nuevas)
    },
    alTeclear: (e: { key: string; preventDefault: () => void }) => {
      if (e.key === 'Escape' && medida.current !== null) {
        e.preventDefault()
        cancelar()
      }
    },
    cancelar,
  }
}
