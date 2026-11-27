'use client'

import { EditorContent } from '@tiptap/react'
import type { DocumentoDelSitio } from '../../../../entities/contenido/documento-limpio'
import { useEditorDelSitio } from '../use-editor-del-sitio'
import { BarraDelEditor } from './barra-del-editor'

export type PropsDelEditorDeDocumento = {
  valor: DocumentoDelSitio | null
  alCambiar: (documento: DocumentoDelSitio | null) => void
  // El id de la etiqueta visible («Texto»).
  etiquetaId: string
  // El id del motivo bajo el campo, si lo hay.
  errorId?: string
  invalido: boolean
  deshabilitado: boolean
  // Con botón de imagen (las guías); sin él, los legales (la base los rechaza con imágenes).
  imagenes?: boolean
  carpetaDeImagenes?: string
}

// El editor de las guías (y, después, de los legales): no sabe nada de ellos. Lo que sale ya está reducido a la lista blanca
// (`documentoLimpio`). Se carga aparte (`editor-diferido`): ni el hub de Configuración ni la lista pagan Tiptap.
export function EditorDeDocumento({
  valor,
  alCambiar,
  etiquetaId,
  errorId,
  invalido,
  deshabilitado,
  imagenes = true,
  carpetaDeImagenes = 'guias',
}: PropsDelEditorDeDocumento) {
  const editor = useEditorDelSitio({
    modo: 'documento',
    valor,
    alCambiar,
    deshabilitado,
    atributos: {
      role: 'textbox',
      'aria-multiline': 'true',
      'aria-labelledby': etiquetaId,
      ...(errorId ? { 'aria-describedby': errorId } : {}),
      ...(invalido ? { 'aria-invalid': 'true' } : {}),
      class:
        'documento-de-seguimiento documento-del-sitio min-h-64 px-3 py-2 text-(length:--text-sm) text-(--color-ink) outline-none [&_blockquote]:border-s-4 [&_blockquote]:border-(--color-line) [&_blockquote]:ps-3 [&_blockquote]:text-(--color-ink-soft) [&_h2]:mt-3 [&_h2]:text-(length:--text-lg) [&_h2]:font-semibold [&_h3]:mt-2 [&_h3]:font-semibold',
    },
  })

  return (
    <div
      className={`focus-within:ring-ring grid min-w-0 rounded-(--radius-md) border bg-(--color-surface) focus-within:ring-2 ${invalido ? 'border-(--color-peligro)' : 'border-(--color-line)'}`}
    >
      <BarraDelEditor
        editor={editor}
        deshabilitado={deshabilitado}
        imagenes={imagenes}
        carpetaDeImagenes={carpetaDeImagenes}
      />
      <EditorContent editor={editor} />
    </div>
  )
}
