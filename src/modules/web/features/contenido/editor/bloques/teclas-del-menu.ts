import { Extension, type Editor } from '@tiptap/react'
import { Plugin } from '@tiptap/pm/state'

// Mientras el menú de bloques está abierto, las flechas, Enter y Escape son suyas y no del texto. El menú (React) deja su manejador en
// `editor.storage.teclasDelMenu.manejar`; devuelve `true` si usó la tecla.
export type ManejadorDeTeclas = (evento: KeyboardEvent) => boolean

export const TeclasDelMenu = Extension.create<object, { manejar: ManejadorDeTeclas | null }>({
  name: 'teclasDelMenu',
  addStorage() {
    return { manejar: null }
  },
  addProseMirrorPlugins() {
    const almacen = this.storage
    return [
      new Plugin({
        props: {
          handleKeyDown: (_vista, evento) => almacen.manejar?.(evento) ?? false,
        },
      }),
    ]
  },
})

type Almacen = { manejar: ManejadorDeTeclas | null }

// El almacén de las teclas del editor, o `null` si es un editor sin este menú (el de los legales).
export function almacenDeLasTeclas(editor: Editor): Almacen | null {
  const almacenes = editor.storage as unknown as Record<string, Almacen | undefined>
  return almacenes['teclasDelMenu'] ?? null
}
