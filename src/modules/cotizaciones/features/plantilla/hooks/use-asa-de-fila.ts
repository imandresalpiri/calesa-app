'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { CSSProperties } from 'react'

// Sin animar con `prefers-reduced-motion`: la fila salta a su lugar.
const sinAnimar = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

// El asa de una fila del lienzo: su nodo, que se desplaza mientras se arrastra, y su botón, lo único
// que la toma, con el puntero o con el teclado. Mientras el editor guarda, no se mueve.
export function useAsaDeFila(id: string, ocupado: boolean) {
  const {
    setNodeRef,
    setActivatorNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    disabled: ocupado,
    attributes: { roleDescription: 'fila que se ordena' },
    ...(sinAnimar() ? { transition: null } : {}),
  })
  const estilo: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    ...(isDragging ? { zIndex: 2 } : {}),
  }
  return {
    alMontar: setNodeRef,
    estilo,
    asa: { alMontar: setActivatorNodeRef, atributos: attributes, oyentes: listeners },
    arrastrando: isDragging,
  }
}

export type AsaDeFila = ReturnType<typeof useAsaDeFila>
