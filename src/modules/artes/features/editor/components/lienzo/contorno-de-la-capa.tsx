'use client'

import { Rect } from 'react-konva'
import type { CapaDeArte } from '../../../../entities/documento'

// En px de pantalla.
const LINEA = 1

// El contorno de la capa bajo el puntero (con «mover», si no está elegida): su caja, girada como ella.
export function ContornoDeLaCapa({
  capa,
  escala,
  color,
}: {
  capa: CapaDeArte
  escala: number
  color: string
}) {
  return (
    <Rect
      x={capa.x + capa.ancho / 2}
      y={capa.y + capa.alto / 2}
      offsetX={capa.ancho / 2}
      offsetY={capa.alto / 2}
      width={capa.ancho}
      height={capa.alto}
      rotation={capa.rotacion}
      stroke={color}
      strokeWidth={LINEA / escala}
      listening={false}
    />
  )
}
