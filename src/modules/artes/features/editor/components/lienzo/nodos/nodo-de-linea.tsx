'use client'

import { memo } from 'react'
import { Line } from 'react-konva'
import type { CapaDe } from '../../../../../entities/documento'
import {
  AGARRE_EN_PANTALLA,
  atributosDeLaCapa,
  sombraDe,
  type DelFormato,
  type Interaccion,
} from './atributos'

type Props = Interaccion & DelFormato & { capa: CapaDe<'linea'>; escala: number }

// Una línea recta entre sus dos puntos (relativos a la esquina de su caja). Una fina se agarra igual: el área de clic no baja de 10 px.
export const NodoDeLinea = memo(function NodoDeLinea({
  capa,
  escala,
  arrastrable,
  escucha,
  tipo,
}: Props) {
  const [desde, hasta] = capa.puntos
  return (
    <Line
      {...atributosDeLaCapa(capa, { arrastrable, escucha })}
      {...sombraDe(capa, tipo)}
      points={[desde.x, desde.y, hasta.x, hasta.y]}
      stroke={capa.borde}
      strokeWidth={capa.grosor}
      hitStrokeWidth={Math.max(capa.grosor, AGARRE_EN_PANTALLA / escala)}
      lineCap="round"
    />
  )
})
