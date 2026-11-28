'use client'

import { memo, useMemo } from 'react'
import { Path } from 'react-konva'
import type { CapaDe } from '../../../../../entities/documento'
import { datosDelTrazo } from '../../../../../entities/editor/pluma'
import {
  AGARRE_EN_PANTALLA,
  atributosDeLaCapa,
  sombraDe,
  TRANSPARENTE,
  type DelFormato,
  type Interaccion,
} from './atributos'

type Props = Interaccion & DelFormato & { capa: CapaDe<'trazo'>; escala: number }

// Un trazo de la pluma: sus curvas Bézier como `Konva.Path`. Cerrado se toca también por dentro; abierto, sólo por la curva.
export const NodoDeTrazo = memo(function NodoDeTrazo({
  capa,
  escala,
  arrastrable,
  escucha,
  tipo,
}: Props) {
  const datos = useMemo(() => datosDelTrazo(capa.nodos, capa.cerrado), [capa.nodos, capa.cerrado])
  return (
    <Path
      {...atributosDeLaCapa(capa, { arrastrable, escucha })}
      {...sombraDe(capa, tipo)}
      data={datos}
      fill={capa.cerrado ? (capa.relleno ?? TRANSPARENTE) : undefined}
      fillEnabled={capa.cerrado}
      stroke={capa.borde ?? undefined}
      strokeWidth={capa.borde ? capa.grosor : 0}
      hitStrokeWidth={Math.max(capa.grosor, AGARRE_EN_PANTALLA / escala)}
      lineCap="round"
      lineJoin="round"
    />
  )
})
