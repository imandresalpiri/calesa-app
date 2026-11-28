'use client'

import { useMemo } from 'react'
import { Circle, Group, Line, Path } from 'react-konva'
import { datosDelTrazo } from '../../../../entities/editor/pluma'
import type { ColoresDelLienzo } from '../../hooks/use-colores-del-lienzo'
import type { TrazoEnCurso as Trazo } from '../../hooks/use-pluma'

// En px de pantalla.
const RADIO_DEL_NODO = 4
const RADIO_DEL_PRIMERO = 6
const LINEA = 1.5
const GUION = 4

type Props = { trazo: Trazo; escala: number; colores: ColoresDelLienzo }

// Lo que la pluma lleva dibujado (en unidades del documento, todavía fuera de él): la curva, el tramo que seguiría hasta el puntero, los
// nodos (el primero, más grande: un clic ahí lo cierra) y las asas del último.
export function TrazoEnCurso({ trazo, escala, colores }: Props) {
  const { nodos, puntero } = trazo
  const datos = useMemo(() => datosDelTrazo(nodos, false), [nodos])
  const ultimo = nodos.at(-1)
  const ancho = LINEA / escala
  return (
    <Group listening={false}>
      <Path data={datos} stroke={colores.acento} strokeWidth={ancho} />
      {ultimo && puntero ? (
        <Line
          points={[ultimo.x, ultimo.y, puntero.x, puntero.y]}
          stroke={colores.acento}
          strokeWidth={ancho}
          dash={[GUION / escala, GUION / escala]}
        />
      ) : null}
      {ultimo
        ? [ultimo.entrada, ultimo.salida].map((asa, i) =>
            asa ? (
              <Group key={i}>
                <Line
                  points={[ultimo.x, ultimo.y, asa.x, asa.y]}
                  stroke={colores.acento}
                  strokeWidth={ancho}
                />
                <Circle
                  x={asa.x}
                  y={asa.y}
                  radius={RADIO_DEL_NODO / escala}
                  fill={colores.acento}
                />
              </Group>
            ) : null,
          )
        : null}
      {nodos.map((nodo, i) => (
        <Circle
          key={i}
          x={nodo.x}
          y={nodo.y}
          radius={(i === 0 ? RADIO_DEL_PRIMERO : RADIO_DEL_NODO) / escala}
          fill={colores.superficie}
          stroke={colores.acento}
          strokeWidth={ancho}
        />
      ))}
    </Group>
  )
}
