'use client'

import type { Editor } from '@tiptap/react'
import { useCallback, useRef } from 'react'
import type { BloqueDeLaGuia } from '../../../../entities/contenido/bloques-de-la-guia'
import { insertarBloque } from '../bloques/comandos'

// Lo que pasa al elegir un bloque del menú: texto, separador, botón y video se insertan al instante; imagen y galería abren primero el selector de
// archivos (`selector`), y el bloque se inserta con lo que se elija (`clave()` dice cuál de los dos pidió).
export function useElegirBloque(editor: Editor | null) {
  const selector = useRef<HTMLInputElement>(null)
  const pedido = useRef<'imagen' | 'galeria'>('imagen')
  const elegir = useCallback(
    (elegido: BloqueDeLaGuia) => {
      if (!editor) {
        return
      }
      if (elegido.clave === 'imagen' || elegido.clave === 'galeria') {
        pedido.current = elegido.clave
        selector.current?.click()
        return
      }
      insertarBloque(editor, elegido.clave, null)
    },
    [editor],
  )
  const clave = useCallback(() => pedido.current, [])
  return { selector, clave, elegir }
}
