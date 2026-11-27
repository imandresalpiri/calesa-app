'use client'

import type { Editor } from '@tiptap/react'
import type { DocumentoDelSitio } from '../../../entities/contenido/documento-limpio'
import { atributosDelLienzo } from './atributos-del-lienzo'
import { useEditorDelSitio } from './use-editor-del-sitio'

type Opciones = {
  cuerpo: DocumentoDelSitio | null
  alCambiar: (documento: DocumentoDelSitio | null) => void
  deshabilitado: boolean
  // El id de la etiqueta que nombra al texto y el del motivo bajo él, si lo hay.
  etiquetaId: string
  errorId: string | undefined
  invalido: boolean
}

// El editor del cuerpo de una guía (modo `guia`): lo crea la página porque lo usan el lienzo y la pestaña «Bloque» del panel.
export function useEditorDeLaGuia({
  cuerpo,
  alCambiar,
  deshabilitado,
  etiquetaId,
  errorId,
  invalido,
}: Opciones): Editor | null {
  return useEditorDelSitio({
    modo: 'guia',
    valor: cuerpo,
    alCambiar,
    deshabilitado,
    atributos: atributosDelLienzo(etiquetaId, errorId, invalido),
  })
}
