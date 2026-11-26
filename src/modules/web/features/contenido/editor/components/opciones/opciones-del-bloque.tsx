'use client'

import type { Editor } from '@tiptap/react'
import { useBloqueElegido } from '../../hooks/use-bloque-elegido'
import { OpcionesDeLaGaleria } from './opciones-de-la-galeria'
import { OpcionesDeLaImagen } from './opciones-de-la-imagen'
import { OpcionesDelBoton } from './opciones-del-boton'
import { OpcionesDelVideo } from './opciones-del-video'

const SIN_OPCIONES = [
  'paragraph',
  'heading',
  'bulletList',
  'orderedList',
  'blockquote',
  'horizontalRule',
]

// La pestaña «Bloque» del panel: las opciones del bloque que está elegido en el lienzo (imagen, galería, botón o video); el resto no tiene.
export function OpcionesDelBloque({
  editor,
  deshabilitado,
}: {
  editor: Editor | null
  deshabilitado: boolean
}) {
  const bloque = useBloqueElegido(editor)
  if (!editor || bloque === null) {
    return <Vacio texto="Elige un bloque para ver sus opciones." />
  }
  switch (bloque.tipo) {
    case 'image':
      return <OpcionesDeLaImagen editor={editor} bloque={bloque} deshabilitado={deshabilitado} />
    case 'gallery':
      return <OpcionesDeLaGaleria editor={editor} bloque={bloque} deshabilitado={deshabilitado} />
    case 'button':
      return <OpcionesDelBoton editor={editor} bloque={bloque} deshabilitado={deshabilitado} />
    case 'video':
      return <OpcionesDelVideo editor={editor} bloque={bloque} deshabilitado={deshabilitado} />
    default:
      return SIN_OPCIONES.includes(bloque.tipo) ? (
        <Vacio texto="Este bloque no tiene opciones." />
      ) : (
        <Vacio texto="Elige un bloque para ver sus opciones." />
      )
  }
}

function Vacio({ texto }: { texto: string }) {
  return <p className="text-(length:--text-sm) text-(--color-ink-soft)">{texto}</p>
}
