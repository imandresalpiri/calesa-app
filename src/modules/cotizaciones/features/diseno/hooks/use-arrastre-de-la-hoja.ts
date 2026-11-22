'use client'

import {
  closestCenter,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useState } from 'react'
import type { ClaveDePieza, Diseno } from '../../../entities/diseno'
import type { DestinoDeLaPieza } from '../../../entities/diseno/orden-del-diseno'
import { esIdDeSeccion, ID_DE_SECCION, ID_DEL_FIN, type IdsDelLienzo } from './ids-del-lienzo'

// Lo que se arrastra sólo choca con lo de su clase: una sección con las secciones, una pieza con las piezas y los finales de sección. Primero lo que está bajo el
// puntero; si nada, lo más cercano.
const deteccion: CollisionDetection = (args) => {
  const deSeccion = esIdDeSeccion(args.active.id)
  const filtrados = {
    ...args,
    droppableContainers: args.droppableContainers.filter((c) => esIdDeSeccion(c.id) === deSeccion),
  }
  const debajo = pointerWithin(filtrados)
  return debajo.length > 0 ? debajo : closestCenter(filtrados)
}

// Adónde cae una pieza soltada sobre `sobre`: el lugar de esa pieza, o el final de una sección.
function destinoDe(d: Diseno, ids: IdsDelLienzo, sobre: string): DestinoDeLaPieza | null {
  if (sobre.startsWith(ID_DEL_FIN)) {
    const seccion = sobre.slice(ID_DEL_FIN.length)
    const s = d.secciones.find((x) => x.id === seccion)
    return s === undefined ? null : { seccion, indice: s.items.length }
  }
  const lugar = ids.lugares.get(sobre)
  return lugar === undefined ? null : { seccion: lugar.seccion, indice: lugar.indice }
}

type Args = {
  trabajo: Diseno
  ids: IdsDelLienzo
  ocupado: boolean
  nombreDe: (id: string) => string
  alMover: (desde: ClaveDePieza, hasta: DestinoDeLaPieza) => void
  alMoverSeccion: (desde: number, hasta: number) => void
}

// El arrastre del lienzo con el puntero (el clic elige; arrastrar 6 px mueve): una pieza dentro de su sección o a otra, una sección entre las secciones. Nada se
// reordena mientras se arrastra (el lienzo está escalado con `zoom` y una traslación se escalaría dos veces): la marca dice dónde cae y el cambio se aplica al
// soltar. Con el teclado se mueve con Alt+flechas y el «⋯» de la pieza (`use-teclas-de-la-pieza.ts`).
export function useArrastreDeLaHoja({
  trabajo,
  ids,
  ocupado,
  nombreDe,
  alMover,
  alMoverSeccion,
}: Args) {
  const sensores = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const [activo, setActivo] = useState<string | null>(null)
  const [sobre, setSobre] = useState<string | null>(null)
  const terminar = () => {
    setActivo(null)
    setSobre(null)
  }
  const alSoltar = ({ active, over }: DragEndEvent) => {
    terminar()
    if (ocupado || over === null || active.id === over.id) return
    const desde = String(active.id)
    const hasta = String(over.id)
    if (esIdDeSeccion(desde)) {
      const indiceDe = (id: string) =>
        trabajo.secciones.findIndex((s) => s.id === id.slice(ID_DE_SECCION.length))
      alMoverSeccion(indiceDe(desde), indiceDe(hasta))
      return
    }
    const lugar = ids.lugares.get(desde)
    const destino = destinoDe(trabajo, ids, hasta)
    if (lugar !== undefined && destino !== null) alMover(lugar.clave, destino)
  }
  const anuncios: Announcements = {
    onDragStart: ({ active }) => `Tomaste «${nombreDe(String(active.id))}».`,
    onDragOver: ({ active, over }) =>
      over === null
        ? undefined
        : `«${nombreDe(String(active.id))}» va donde «${nombreDe(String(over.id))}».`,
    // Lo que se movió lo dice la región del editor («Moviste…»).
    onDragEnd: () => undefined,
    onDragCancel: ({ active }) => `Se canceló: «${nombreDe(String(active.id))}» volvió a su lugar.`,
  }
  return {
    activo,
    // Dónde caería lo que se arrastra (la marca del lienzo); nulo si no se arrastra una pieza.
    destino:
      activo === null || sobre === null || esIdDeSeccion(activo)
        ? null
        : destinoDe(trabajo, ids, sobre),
    seccionDestino: activo !== null && esIdDeSeccion(activo) ? sobre : null,
    contexto: {
      sensors: sensores,
      collisionDetection: deteccion,
      onDragStart: ({ active }: DragStartEvent) => {
        setActivo(String(active.id))
      },
      onDragOver: ({ over }: DragOverEvent) => {
        setSobre(over === null ? null : String(over.id))
      },
      onDragEnd: alSoltar,
      onDragCancel: terminar,
      accessibility: { announcements: anuncios },
    },
  }
}

export type ArrastreDeLaHoja = ReturnType<typeof useArrastreDeLaHoja>
