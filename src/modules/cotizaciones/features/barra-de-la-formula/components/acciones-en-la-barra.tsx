'use client'

import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useContextoDeLaBarra } from './contexto'

type Props = {
  // Dónde va entre las acciones de la barra (1 primero): lo que se monta antes no queda a la izquierda por eso.
  orden: number
  children: ReactNode
}

// Lo que el editor ofrece («Guardar el borrador», «Publicar…», «⋯»), llevado a la barra de la fórmula. Fuera de ella (la puesta en marcha) se
// dibuja donde está.
export function AccionesEnLaBarra({ orden, children }: Props) {
  const contexto = useContextoDeLaBarra()
  if (contexto === null) {
    return children
  }
  return contexto.ranura
    ? createPortal(
        <div style={{ order: orden }} className="flex min-w-0 items-center gap-2">
          {children}
        </div>,
        contexto.ranura,
      )
    : null
}
