'use client'

import type { KonvaEventObject } from 'konva/lib/Node'
import { Circle, Group, Line } from 'react-konva'
import type { CapaDe, NodoDelTrazo } from '../../../../entities/documento'
import { moverAsa, moverNodo } from '../../../../entities/editor/pluma'
import type { ColoresDelLienzo } from '../../hooks/use-colores-del-lienzo'
import type { PlumaDelLienzo } from '../../hooks/use-pluma'

// En px de pantalla.
const RADIO_DEL_NODO = 5
const RADIO_DEL_ASA = 4
const LINEA = 1.5

type Props = {
  capa: CapaDe<'trazo'>
  pluma: PlumaDelLienzo
  escala: number
  colores: ColoresDelLienzo
}

type Arrastre = KonvaEventObject<DragEvent>

const LADOS = ['entrada', 'salida'] as const

function Asas({ capa, pluma, escala, colores, indice }: Props & { indice: number }) {
  const nodo: NodoDelTrazo | undefined = capa.nodos[indice]
  if (!nodo) {
    return null
  }
  const mover = (lado: (typeof LADOS)[number], final: boolean) => (e: Arrastre) => {
    const punto = e.target.position()
    // Con Alt, sólo esa asa (el nodo queda en punta); si no, la otra se refleja.
    pluma.editar(capa.id, (nodos) => moverAsa(nodos, indice, { lado, punto }, !e.evt.altKey), final)
  }
  return LADOS.map((lado) => {
    const asa = nodo[lado]
    return asa ? (
      <Group key={lado}>
        <Line
          points={[nodo.x, nodo.y, asa.x, asa.y]}
          stroke={colores.acento}
          strokeWidth={LINEA / escala}
          listening={false}
        />
        <Circle
          x={asa.x}
          y={asa.y}
          radius={RADIO_DEL_ASA / escala}
          fill={colores.acento}
          draggable
          onPointerDown={(e) => {
            e.cancelBubble = true
          }}
          onDragStart={pluma.empezarAEditar}
          onDragMove={mover(lado, false)}
          onDragEnd={mover(lado, true)}
        />
      </Group>
    ) : null
  })
}

// Los nodos de un trazo elegido, encima, girados como la capa (relativos a la esquina de su caja): apretar uno lo elige (Supr lo quita),
// arrastrarlo lo mueve y las asas del elegido cambian la curva. Cada gesto es un paso del historial.
export function AsasDelTrazo(props: Props) {
  const { capa, pluma, escala, colores } = props
  const elegido = pluma.elegido?.id === capa.id ? pluma.elegido.indice : null
  const mover = (indice: number, final: boolean) => (e: Arrastre) => {
    const punto = e.target.position()
    pluma.editar(capa.id, (nodos) => moverNodo(nodos, indice, punto), final)
  }
  return (
    <Group
      x={capa.x + capa.ancho / 2}
      y={capa.y + capa.alto / 2}
      offsetX={capa.ancho / 2}
      offsetY={capa.alto / 2}
      rotation={capa.rotacion}
    >
      {elegido === null ? null : <Asas {...props} indice={elegido} />}
      {capa.nodos.map((nodo, indice) => (
        <Circle
          key={indice}
          x={nodo.x}
          y={nodo.y}
          radius={RADIO_DEL_NODO / escala}
          fill={indice === elegido ? colores.acento : colores.superficie}
          stroke={colores.acento}
          strokeWidth={LINEA / escala}
          draggable
          onPointerDown={(e) => {
            e.cancelBubble = true
            pluma.elegirNodo({ id: capa.id, indice })
          }}
          onDragStart={pluma.empezarAEditar}
          onDragMove={mover(indice, false)}
          onDragEnd={mover(indice, true)}
        />
      ))}
    </Group>
  )
}
