'use client'

import { useEditorState, type Editor } from '@tiptap/react'

export type BloqueElegido = {
  // El lugar del bloque entre los del primer nivel.
  indice: number
  tipo: string
  atributos: Record<string, unknown>
  // Cuántos bloques tiene el documento.
  cantidad: number
  // Un párrafo sin nada escrito.
  vacio: boolean
}

export const TIPOS_DE_TEXTO = ['paragraph', 'heading', 'bulletList', 'orderedList', 'blockquote']

// El bloque del primer nivel donde está el cursor (o el elegido, si es una imagen, una galería, un botón o un video): el que la barrita y la pestaña
// «Bloque» manejan.
export function useBloqueElegido(editor: Editor | null): BloqueElegido | null {
  return useEditorState({
    editor,
    selector: ({ editor: e }): BloqueElegido | null => {
      if (!e) {
        return null
      }
      const { doc, selection } = e.state
      const indice = selection.$from.index(0)
      const nodo = doc.maybeChild(indice)
      return nodo === null
        ? null
        : {
            indice,
            tipo: nodo.type.name,
            atributos: nodo.attrs,
            cantidad: doc.childCount,
            vacio: nodo.type.name === 'paragraph' && nodo.content.size === 0,
          }
    },
  })
}

// Un atributo de texto del bloque elegido; vacío si no lo tiene.
export function textoDelBloque(bloque: BloqueElegido, atributo: string): string {
  const valor = bloque.atributos[atributo]
  return typeof valor === 'string' ? valor : ''
}
