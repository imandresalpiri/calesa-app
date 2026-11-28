'use client'

import { Line } from 'react-konva'
import type { Guia } from '../../../../entities/editor/guias'
import type { ColoresDelLienzo } from '../../hooks/use-colores-del-lienzo'

// En px de pantalla.
const LINEA = 1

// Las guías inteligentes mientras se arrastra: la línea donde coincide un borde o un centro.
export function GuiasEnElLienzo({
  guias,
  escala,
  colores,
}: {
  guias: readonly Guia[]
  escala: number
  colores: ColoresDelLienzo
}) {
  return guias.map((g, i) => (
    <Line
      key={i}
      points={
        g.eje === 'x'
          ? [g.posicion, g.desde, g.posicion, g.hasta]
          : [g.desde, g.posicion, g.hasta, g.posicion]
      }
      stroke={colores.guia}
      strokeWidth={LINEA / escala}
      listening={false}
    />
  ))
}
