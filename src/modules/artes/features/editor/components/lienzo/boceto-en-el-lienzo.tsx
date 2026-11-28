'use client'

import { Ellipse, Group, Line, Rect } from 'react-konva'
import { LADOS_DEL_POLIGONO_NUEVO } from '../../../../entities/editor/capas-nuevas'
import { puntosDelPoligono } from '../../../../entities/editor/dibujo'
import type { ColoresDelLienzo } from '../../hooks/use-colores-del-lienzo'
import type { Boceto } from '../../hooks/gestos-del-lienzo'

// En px de pantalla.
const LINEA = 1
const GUION = 4
const VELO = 0.08

type Props = { boceto: Boceto; escala: number; colores: ColoresDelLienzo }

// Lo que se ve mientras dura un gesto: el recuadro que elige (con un velo) o el contorno de la forma que se está por crear.
export function BocetoEnElLienzo({ boceto, escala, colores }: Props) {
  const trazo = { stroke: colores.acento, strokeWidth: LINEA / escala, listening: false }
  if (boceto.tipo === 'linea') {
    const { desde, hasta } = boceto
    return <Line points={[desde.x, desde.y, hasta.x, hasta.y]} {...trazo} />
  }
  const { x, y, ancho, alto } = boceto.caja
  if (boceto.tipo === 'recuadro') {
    return (
      <Group listening={false}>
        <Rect x={x} y={y} width={ancho} height={alto} fill={colores.acento} opacity={VELO} />
        <Rect x={x} y={y} width={ancho} height={alto} {...trazo} />
      </Group>
    )
  }
  switch (boceto.herramienta) {
    case 'elipse':
      return (
        <Ellipse
          x={x + ancho / 2}
          y={y + alto / 2}
          radiusX={ancho / 2}
          radiusY={alto / 2}
          {...trazo}
        />
      )
    case 'poligono':
      return (
        <Line
          x={x}
          y={y}
          points={puntosDelPoligono(LADOS_DEL_POLIGONO_NUEVO, ancho, alto)}
          closed
          {...trazo}
        />
      )
    case 'texto':
      return (
        <Rect
          x={x}
          y={y}
          width={ancho}
          height={alto}
          dash={[GUION / escala, GUION / escala]}
          {...trazo}
        />
      )
    case 'rectangulo':
      return <Rect x={x} y={y} width={ancho} height={alto} {...trazo} />
  }
}
