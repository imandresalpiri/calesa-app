import { Extension } from '@tiptap/react'
import { Plugin } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

// El texto gris del párrafo vacío donde está el cursor: dice cómo elegir un bloque. Es una decoración: no entra al documento.
export const MarcadorDeVacio = Extension.create({
  name: 'marcadorDeVacio',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          decorations: ({ doc, selection }) => {
            const { $from, empty } = selection
            if (!empty || $from.depth !== 1 || $from.parent.type.name !== 'paragraph') {
              return null
            }
            if ($from.parent.content.size > 0) {
              return null
            }
            return DecorationSet.create(doc, [
              Decoration.node($from.before(1), $from.after(1), {
                class: 'es-vacio',
                'data-vacio': 'Escribe «/» para elegir un bloque',
              }),
            ])
          },
        },
      }),
    ]
  },
})
