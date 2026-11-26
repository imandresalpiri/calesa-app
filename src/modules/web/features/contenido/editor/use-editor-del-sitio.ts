'use client'

import { useEditor, type Editor } from '@tiptap/react'
import { useEffect } from 'react'
import {
  documentoLimpio,
  type DocumentoDelSitio,
} from '../../../entities/contenido/documento-limpio'
import { extensionesDelSitio, type ModoDelEditor } from './extensiones'

export type OpcionesDelEditorDelSitio = {
  modo: ModoDelEditor
  valor: DocumentoDelSitio | null
  alCambiar: (documento: DocumentoDelSitio | null) => void
  deshabilitado: boolean
  // Los atributos `aria-*` y la clase del textbox.
  atributos: Record<string, string>
}

const igual = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

// El editor del sitio con lo que toda pantalla suya necesita: lo que sale ya está reducido a la lista blanca (`documentoLimpio`), lo que cambia desde
// afuera (un borrador que se repone, «Recargar» tras un conflicto) entra sin devolver un cambio y `deshabilitado` apaga la edición. Lo usan los
// legales (modo `documento`) y la guía (modo `guia`).
export function useEditorDelSitio({
  modo,
  valor,
  alCambiar,
  deshabilitado,
  atributos,
}: OpcionesDelEditorDelSitio): Editor | null {
  const editor = useEditor({
    extensions: extensionesDelSitio(modo),
    content: valor ?? '',
    editable: !deshabilitado,
    immediatelyRender: false,
    editorProps: { attributes: atributos },
    onUpdate: ({ editor: e }) => {
      alCambiar(documentoLimpio(e.getJSON()))
    },
  })

  useEffect(() => {
    if (editor && !igual(documentoLimpio(editor.getJSON()), valor)) {
      editor.commands.setContent(valor ?? '', { emitUpdate: false })
    }
  }, [editor, valor])

  useEffect(() => {
    editor?.setEditable(!deshabilitado)
  }, [editor, deshabilitado])

  return editor
}
