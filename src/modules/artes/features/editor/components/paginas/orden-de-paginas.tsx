'use client'

import {
  closestCenter,
  DndContext,
  KeyboardCode,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type Modifier,
} from '@dnd-kit/core'
import {
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { useId, type ReactNode } from 'react'
import { nombreDeLaPagina } from '../../../../entities/editor/paginas'

const INSTRUCCIONES =
  'Para cambiar el orden, arrastra la página, o enfócala, pulsa Espacio, muévela con ← o → y vuelve a pulsar Espacio. Esc cancela; Enter la elige.'

// Se mueven sólo de costado (sin `@dnd-kit/modifiers`).
const soloHorizontal: Modifier = ({ transform }) => ({ ...transform, y: 0 })

// Espacio la toma y la suelta; Enter, no: es el clic que la elige.
const TECLAS = {
  start: [KeyboardCode.Space],
  cancel: [KeyboardCode.Esc],
  end: [KeyboardCode.Space, KeyboardCode.Enter],
}

function anuncios(ids: readonly string[]): Announcements {
  const nombre = (id: string | number) => `«${nombreDeLaPagina(ids.indexOf(String(id)))}»`
  const cancelado = (id: string | number) => `Se canceló: ${nombre(id)} volvió a su lugar.`
  return {
    onDragStart: ({ active }) => `Tomaste ${nombre(active.id)}.`,
    onDragOver: ({ active, over }) =>
      over === null ? undefined : `${nombre(active.id)} está sobre ${nombre(over.id)}.`,
    onDragEnd: ({ active, over }) =>
      over === null || over.id === active.id
        ? cancelado(active.id)
        : `Soltaste ${nombre(active.id)} en el lugar de ${nombre(over.id)}.`,
    onDragCancel: ({ active }) => cancelado(active.id),
  }
}

type Props = {
  ids: readonly string[]
  soloLectura: boolean
  // Soltar una página sobre otra la lleva a su índice.
  alMover: (id: string, hasta: number) => void
  children: ReactNode
}

// El orden de la tira de páginas con dnd-kit: con el puntero (pasados 4 px) o con el teclado, de costado y con los anuncios para el lector de
// pantalla. En sólo lectura nada se arrastra.
export function OrdenDePaginas({ ids, soloLectura, alMover, children }: Props) {
  const id = useId()
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: TECLAS,
    }),
  )

  function alSoltar({ active, over }: DragEndEvent) {
    if (over !== null && active.id !== over.id) {
      alMover(String(active.id), ids.indexOf(String(over.id)))
    }
  }

  return (
    <DndContext
      id={id}
      sensors={sensores}
      collisionDetection={closestCenter}
      modifiers={[soloHorizontal]}
      onDragEnd={alSoltar}
      accessibility={{
        screenReaderInstructions: { draggable: INSTRUCCIONES },
        announcements: anuncios(ids),
      }}
    >
      <SortableContext
        items={[...ids]}
        strategy={horizontalListSortingStrategy}
        disabled={soloLectura}
      >
        <ul aria-label="Páginas" className="flex w-max items-start gap-2 px-3 pt-1">
          {children}
        </ul>
      </SortableContext>
    </DndContext>
  )
}
