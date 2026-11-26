import type { Editor } from '@tiptap/react'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  BoldIcon,
  ItalicIcon,
  LinkIcon,
  SlidersHorizontalIcon,
  Trash2Icon,
  type LucideIcon,
} from 'lucide-react'
import { moverBloque, quitarBloque } from '../../bloques/comandos'
import { TIPOS_DE_TEXTO, type BloqueElegido } from '../../hooks/use-bloque-elegido'

export type AccionDeLaBarrita = {
  etiqueta: string
  Icono: LucideIcon
  // Una acción que alterna (negrita) dice si está activa; una que sólo hace algo (subir) no.
  alternable: boolean
  activa: boolean
  apagada: boolean
  aplicar: () => void
}

export type FormatoDelCursor = { negrita: boolean; cursiva: boolean; enlace: boolean }

type Contexto = {
  editor: Editor
  bloque: BloqueElegido
  formato: FormatoDelCursor
  enlazando: boolean
  alternarEnlace: () => void
  alAbrirOpciones: () => void
}

const hace = (
  etiqueta: string,
  Icono: LucideIcon,
  aplicar: () => void,
  apagada = false,
): AccionDeLaBarrita => ({ etiqueta, Icono, alternable: false, activa: false, apagada, aplicar })

const alterna = (
  etiqueta: string,
  Icono: LucideIcon,
  activa: boolean,
  aplicar: () => void,
): AccionDeLaBarrita => ({ etiqueta, Icono, alternable: true, activa, apagada: false, aplicar })

// Lo que la barrita ofrece sobre el bloque elegido: moverlo, sus opciones y quitarlo; si es texto, además negrita, cursiva y enlace.
export function accionesDeLaBarrita(contexto: Contexto): AccionDeLaBarrita[] {
  const { editor, bloque, formato, enlazando } = contexto
  const base = [
    hace(
      'Subir el bloque',
      ArrowUpIcon,
      () => moverBloque(editor, bloque.indice, 'subir'),
      bloque.indice === 0,
    ),
    hace(
      'Bajar el bloque',
      ArrowDownIcon,
      () => moverBloque(editor, bloque.indice, 'bajar'),
      bloque.indice >= bloque.cantidad - 1,
    ),
    hace('Opciones del bloque', SlidersHorizontalIcon, contexto.alAbrirOpciones),
    hace('Quitar el bloque', Trash2Icon, () => {
      quitarBloque(editor, bloque.indice)
    }),
  ]
  if (!TIPOS_DE_TEXTO.includes(bloque.tipo)) {
    return base
  }
  return [
    ...base,
    alterna('Negrita', BoldIcon, formato.negrita, () => {
      editor.chain().focus().toggleBold().run()
    }),
    alterna('Cursiva', ItalicIcon, formato.cursiva, () => {
      editor.chain().focus().toggleItalic().run()
    }),
    alterna('Enlace', LinkIcon, enlazando || formato.enlace, contexto.alternarEnlace),
  ]
}
