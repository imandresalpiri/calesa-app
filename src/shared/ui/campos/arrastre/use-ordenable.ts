'use client'

import { useDraggable, useDroppable } from '@dnd-kit/core'
import { useSortable } from '@dnd-kit/sortable'
import { CSS, type Transform } from '@dnd-kit/utilities'
import { use, type CSSProperties } from 'react'
import { ArrastreActivo } from './contexto'

// Sin animar con `prefers-reduced-motion`: la fila salta a su lugar.
const sinAnimar = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

const DESCRIPCION = 'elemento que se ordena'

function estiloDe(
  transform: Transform | null,
  transition: string | undefined,
  arrastrando: boolean,
): CSSProperties {
  return {
    transform: CSS.Translate.toString(transform),
    transition,
    ...(arrastrando ? { position: 'relative', zIndex: 20 } : {}),
  }
}

export type Asa = {
  alMontar: (nodo: HTMLElement | null) => void
  atributos: object
  oyentes: object | undefined
}

// Una fila o una casilla que se ordena dentro de su lista (`SortableContext`).
export function useOrdenable(id: string) {
  const activo = use(ArrastreActivo)
  const ordenable = useSortable({
    id,
    disabled: !activo,
    attributes: { roleDescription: DESCRIPCION },
    ...(sinAnimar() ? { transition: null } : {}),
  })
  const {
    setNodeRef,
    setActivatorNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = ordenable
  return {
    alMontar: setNodeRef,
    estilo: estiloDe(transform, transition, isDragging),
    asa: { alMontar: setActivatorNodeRef, atributos: attributes, oyentes: listeners } satisfies Asa,
  }
}

// Una fila fija: se arrastra hacia las casillas pero no recibe nada. Lleva también un soltable apagado con el mismo id: el teclado del
// arrastre busca lo que se arrastra entre los soltables.
export function useArrastrable(id: string, destino: string) {
  const activo = use(ArrastreActivo)
  const arrastrable = useDraggable({
    id,
    disabled: !activo,
    data: { destino },
    attributes: { roleDescription: DESCRIPCION },
  })
  const soltable = useDroppable({ id, disabled: true })
  const { setNodeRef, setActivatorNodeRef, attributes, listeners, transform, isDragging } =
    arrastrable
  const { setNodeRef: setSoltable } = soltable
  return {
    alMontar: (nodo: HTMLElement | null) => {
      setNodeRef(nodo)
      setSoltable(nodo)
    },
    estilo: estiloDe(transform, undefined, isDragging),
    asa: { alMontar: setActivatorNodeRef, atributos: attributes, oyentes: listeners } satisfies Asa,
  }
}

// Un lugar libre de las casillas: sólo recibe.
export function useLibre(id: string, contenedor: string) {
  const activo = use(ArrastreActivo)
  const { setNodeRef } = useDroppable({ id, disabled: !activo, data: { contenedor } })
  return setNodeRef
}
