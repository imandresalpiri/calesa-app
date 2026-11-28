'use client'

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type Modifier,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useId, useMemo, type ReactNode, type Ref } from 'react'
import type { Despachar } from '../../tipos'

const INSTRUCCIONES =
  'Para cambiar el orden, arrastra la fila, o enfoca su asa, pulsa Espacio, muévela con ↑ o ↓ y vuelve a pulsar Espacio. Esc cancela.'

// Se mueven sólo de arriba abajo (sin `@dnd-kit/modifiers`).
const soloVertical: Modifier = ({ transform }) => ({ ...transform, x: 0 })

function anuncios(nombres: ReadonlyMap<string, string>): Announcements {
  const nombre = (id: string | number) => `«${nombres.get(String(id)) ?? ''}»`
  const cancelado = (id: string | number) => `Se canceló: ${nombre(id)} volvió a su lugar.`
  return {
    onDragStart: ({ active }) => `Tomaste ${nombre(active.id)}.`,
    onDragOver: ({ active, over }) =>
      over === null ? undefined : `${nombre(active.id)} está sobre ${nombre(over.id)}.`,
    onDragEnd: ({ active, over }) =>
      over === null || over.id === active.id
        ? cancelado(active.id)
        : `Soltaste ${nombre(active.id)} sobre ${nombre(over.id)}.`,
    onDragCancel: ({ active }) => cancelado(active.id),
  }
}

type Props = {
  // Los ids de las filas de arriba hacia abajo, separados por un espacio: con el mismo orden, las filas no se vuelven a dibujar.
  clave: string
  nombres: ReadonlyMap<string, string>
  soloLectura: boolean
  despachar: Despachar
  refDeLaLista: Ref<HTMLUListElement>
  children: ReactNode
}

// El orden de «Capas» con dnd-kit: con el puntero (pasados 4 px) o con el teclado desde el asa, de arriba abajo y con los anuncios para el
// lector de pantalla. Soltar una fila sobre otra despacha `moverEnCapas`. En sólo lectura nada se arrastra.
export function OrdenDeCapas({
  clave,
  nombres,
  soloLectura,
  despachar,
  refDeLaLista,
  children,
}: Props) {
  const id = useId()
  const ids = useMemo(() => (clave === '' ? [] : clave.split(' ')), [clave])
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function alSoltar({ active, over }: DragEndEvent) {
    if (over !== null && active.id !== over.id) {
      despachar({ tipo: 'moverEnCapas', arrastrado: String(active.id), sobre: String(over.id) })
    }
  }

  return (
    <DndContext
      id={id}
      sensors={sensores}
      collisionDetection={closestCenter}
      modifiers={[soloVertical]}
      onDragEnd={alSoltar}
      accessibility={{
        screenReaderInstructions: { draggable: INSTRUCCIONES },
        announcements: anuncios(nombres),
      }}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy} disabled={soloLectura}>
        <ul
          ref={refDeLaLista}
          role="grid"
          aria-label="Capas"
          aria-multiselectable
          aria-readonly={soloLectura}
          className="grid grid-cols-[minmax(0,1fr)] gap-px"
        >
          {children}
        </ul>
      </SortableContext>
    </DndContext>
  )
}
