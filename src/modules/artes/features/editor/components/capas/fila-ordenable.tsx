'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from 'cn'
import { GripVerticalIcon } from 'lucide-react'
import type { ReactNode } from 'react'

type Props = {
  // El id de la capa o del grupo: lo que se arrastra.
  id: string
  nombre: string
  elegida: boolean
  // En sólo lectura o mientras se renombra, la fila no se arrastra.
  quieta: boolean
  // Un miembro de un grupo va sangrado debajo de la fila del grupo.
  sangrada: boolean
  // El icono y el nombre (la celda que crece) y los botones del final.
  nombreDeLaFila: ReactNode
  botones: ReactNode
}

// Una fila de «Capas» (de una capa o de un grupo), ordenable con dnd-kit: con el puntero se arrastra desde cualquier lugar de la fila (pasados
// 4 px; antes es un clic) y con el teclado desde su asa (Espacio la toma, ↑ y ↓ la mueven, Espacio la suelta, Esc cancela). Elegida se ve
// marcada (`aria-selected`, `data-state="elegida"`).
export function FilaOrdenable({
  id,
  nombre,
  elegida,
  quieta,
  sangrada,
  nombreDeLaFila,
  botones,
}: Props) {
  const ordenable = useSortable({
    id,
    disabled: quieta,
    attributes: { roleDescription: 'elemento que se ordena' },
  })
  const { setNodeRef, setActivatorNodeRef, attributes, listeners, transform, transition } =
    ordenable
  const { isDragging } = ordenable
  return (
    <li
      ref={setNodeRef}
      role="row"
      aria-selected={elegida}
      data-state={elegida ? 'elegida' : 'suelta'}
      data-fila-de-capas={id}
      {...listeners}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        ...(isDragging ? { position: 'relative', zIndex: 10 } : {}),
      }}
      className={cn(
        'group/fila flex min-h-9 min-w-0 items-center gap-0.5 rounded-(--radius-md) pr-1 text-(length:--text-sm) text-(--color-ink)',
        'hover:bg-(--color-surface-2) data-[state=elegida]:bg-(--color-primario-soft) data-[state=elegida]:text-(--color-primario-ink)',
        sangrada && 'pl-4',
        isDragging && 'bg-(--color-surface) shadow-(--shadow-md)',
      )}
    >
      <span role="gridcell" className="flex shrink-0 items-center">
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          aria-label={`Mover «${nombre}»`}
          title={quieta ? undefined : 'Arrastra para cambiar el orden'}
          className="inline-flex h-8 w-5 shrink-0 cursor-grab touch-none items-center justify-center rounded-(--radius-sm) text-(--color-ink-faint) outline-none hover:text-(--color-ink-soft) focus-visible:shadow-(--shadow-focus) active:cursor-grabbing aria-disabled:cursor-default aria-disabled:opacity-40"
        >
          <GripVerticalIcon aria-hidden className="size-3.5" />
        </button>
      </span>
      <span role="gridcell" className="flex min-w-0 flex-1 items-center gap-1.5">
        {nombreDeLaFila}
      </span>
      <span role="gridcell" className="flex shrink-0 items-center">
        {botones}
      </span>
    </li>
  )
}
