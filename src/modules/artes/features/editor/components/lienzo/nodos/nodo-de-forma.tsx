'use client'

import { memo } from 'react'
import { Ellipse, Line, Rect } from 'react-konva'
import type { CapaDe } from '../../../../../entities/documento'
import { puntosDelPoligono } from '../../../../../entities/editor/dibujo'
import {
  atributosDeLaCapa,
  sombraDe,
  TRANSPARENTE,
  type DelFormato,
  type Interaccion,
} from './atributos'

type Props = Interaccion & DelFormato & { capa: CapaDe<'forma'> }

// Un rectángulo (con sus esquinas redondeadas), una elipse o un polígono regular que llena su caja. Sin relleno se puede tocar igual.
export const NodoDeForma = memo(function NodoDeForma({ capa, arrastrable, escucha, tipo }: Props) {
  const interaccion = { arrastrable, escucha }
  const pintura = {
    fill: capa.relleno ?? TRANSPARENTE,
    stroke: capa.borde ?? undefined,
    strokeWidth: capa.borde ? capa.grosor : 0,
    ...sombraDe(capa, tipo),
  }
  if (capa.forma === 'elipse') {
    return (
      <Ellipse
        {...atributosDeLaCapa(capa, interaccion, true)}
        {...pintura}
        radiusX={capa.ancho / 2}
        radiusY={capa.alto / 2}
      />
    )
  }
  if (capa.forma === 'poligono') {
    return (
      <Line
        {...atributosDeLaCapa(capa, interaccion)}
        {...pintura}
        points={puntosDelPoligono(capa.lados ?? 3, capa.ancho, capa.alto)}
        closed
        lineJoin="round"
      />
    )
  }
  return (
    <Rect
      {...atributosDeLaCapa(capa, interaccion)}
      {...pintura}
      width={capa.ancho}
      height={capa.alto}
      cornerRadius={capa.radio}
    />
  )
})
