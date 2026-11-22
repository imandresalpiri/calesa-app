'use client'

import type { RefObject } from 'react'
import type { ManejadoresDelCampo } from '../../../hooks/use-texto-con-pastillas'

type Props = {
  campoRef: RefObject<HTMLDivElement | null>
  manejadores: ManejadoresDelCampo
  etiqueta: string
  describe: string
  invalido: boolean
}

// El campo del texto con datos: un `contentEditable` con el aspecto de `Textarea` y cada dato como una pastilla (las dibuja `useTextoConPastillas`, no React).
export function TextoConPastillas({ campoRef, manejadores, etiqueta, describe, invalido }: Props) {
  return (
    <div
      ref={campoRef}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-multiline="true"
      aria-labelledby={etiqueta}
      aria-describedby={describe}
      aria-invalid={invalido}
      tabIndex={0}
      data-campo-del-texto=""
      className="border-input focus-visible:border-ring focus-visible:ring-ring aria-invalid:border-destructive aria-invalid:ring-destructive/20 min-h-16 w-full min-w-0 rounded-lg border bg-transparent px-2.5 py-2 text-base break-words whitespace-pre-wrap outline-none focus-visible:ring-3 aria-invalid:ring-3 md:text-sm"
      {...manejadores}
    />
  )
}
