'use client'

import { useEditorState, type Editor } from '@tiptap/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { almacenDeLasTeclas } from '../bloques/teclas-del-menu'
import {
  filtrarBloques,
  type BloqueDeLaGuia,
} from '../../../../entities/contenido/bloques-de-la-guia'

const PATRON = /^\/[\p{L}\d ]{0,20}$/u

export type MenuDeBloques = {
  abierto: boolean
  bloques: BloqueDeLaGuia[]
  elegido: number
  elegirNumero: (n: number) => void
  cerrar: () => void
}

// El texto que se escribió después de «/» en un párrafo del primer nivel (o `null` si el cursor no está en uno así): abre el menú de bloques.
function escritoDelComando(editor: Editor | null): string | null {
  if (!editor) {
    return null
  }
  const { selection } = editor.state
  const { $from, empty } = selection
  if (!empty || $from.depth !== 1 || $from.parent.type.name !== 'paragraph') {
    return null
  }
  const texto = $from.parent.textContent
  return PATRON.test(texto) ? texto.slice(1) : null
}

// El menú que abre «/»: lo que se escribe filtra; las flechas, Enter y Escape van por `teclasDelMenu`. Escape lo cierra hasta que se escriba otra cosa.
export function useMenuDeBloques(
  editor: Editor | null,
  alElegir: (bloque: BloqueDeLaGuia) => void,
): MenuDeBloques {
  const escrito = useEditorState({ editor, selector: ({ editor: e }) => escritoDelComando(e) })
  const [descartado, setDescartado] = useState<string | null>(null)
  // La elegida es de lo escrito: al escribir otra cosa vuelve a ser la primera.
  const [eleccion, setEleccion] = useState({ escrito: '', n: 0 })
  const elegido = eleccion.escrito === (escrito ?? '') ? eleccion.n : 0
  const elegirNumero = useCallback(
    (n: number) => {
      setEleccion({ escrito: escrito ?? '', n })
    },
    [escrito],
  )
  const bloques = useMemo(() => (escrito === null ? [] : filtrarBloques(escrito)), [escrito])
  const abierto = escrito !== null && escrito !== descartado

  useEffect(() => {
    const almacen = editor ? almacenDeLasTeclas(editor) : null
    if (!almacen) {
      return undefined
    }
    almacen.manejar = abierto
      ? (evento) => {
          if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
            if (bloques.length > 0) {
              const paso = evento.key === 'ArrowDown' ? 1 : -1
              elegirNumero((elegido + paso + bloques.length) % bloques.length)
            }
            return true
          }
          if (evento.key === 'Enter' && !evento.shiftKey) {
            const bloque = bloques[elegido]
            if (bloque) {
              alElegir(bloque)
            }
            return true
          }
          if (evento.key === 'Escape') {
            setDescartado(escrito)
            return true
          }
          return false
        }
      : null
    return () => {
      almacen.manejar = null
    }
  }, [editor, abierto, bloques, elegido, elegirNumero, escrito, alElegir])

  return {
    abierto,
    bloques,
    elegido,
    elegirNumero,
    cerrar: () => {
      setDescartado(escrito)
    },
  }
}
