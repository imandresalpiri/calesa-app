'use client'

import type { Editor } from '@tiptap/react'
import { useEffect, useState, type RefObject } from 'react'
import { posDelBloque } from '../bloques/comandos'

export type Caja = { top: number; left: number; width: number; height: number }

const igual = (a: Caja | null, b: Caja | null) =>
  a === b ||
  (a !== null &&
    b !== null &&
    a.top === b.top &&
    a.left === b.left &&
    a.width === b.width &&
    a.height === b.height)

function medir(editor: Editor, contenedor: HTMLElement): Caja | null {
  if (editor.isDestroyed || !editor.isInitialized) {
    return null
  }
  const { doc, selection } = editor.state
  const indice = selection.$from.index(0)
  if (indice >= doc.childCount) {
    return null
  }
  const dom = editor.view.nodeDOM(posDelBloque(doc, indice))
  if (!(dom instanceof HTMLElement)) {
    return null
  }
  const bloque = dom.getBoundingClientRect()
  const marco = contenedor.getBoundingClientRect()
  return {
    top: Math.round(bloque.top - marco.top),
    left: Math.round(bloque.left - marco.left),
    width: Math.round(bloque.width),
    height: Math.round(bloque.height),
  }
}

// Dónde está, dentro del lienzo, el bloque elegido: de ahí cuelgan la barrita, el «+» y el menú (todos flotan, ninguno empuja el texto). Se vuelve a medir
// con cada cambio del editor, al cambiar el tamaño del texto y al girar la pantalla.
export function useCajaDelBloque(
  editor: Editor | null,
  contenedor: RefObject<HTMLElement | null>,
): Caja | null {
  const [caja, setCaja] = useState<Caja | null>(null)

  useEffect(() => {
    if (!editor) {
      return undefined
    }
    let cuadro = 0
    const actualizar = () => {
      cancelAnimationFrame(cuadro)
      cuadro = requestAnimationFrame(() => {
        const marco = contenedor.current
        const nueva = marco ? medir(editor, marco) : null
        setCaja((antes) => (igual(antes, nueva) ? antes : nueva))
      })
    }
    editor.on('transaction', actualizar)
    editor.on('focus', actualizar)
    window.addEventListener('resize', actualizar)
    const observador = new ResizeObserver(actualizar)
    if (contenedor.current) {
      observador.observe(contenedor.current)
    }
    actualizar()
    return () => {
      cancelAnimationFrame(cuadro)
      editor.off('transaction', actualizar)
      editor.off('focus', actualizar)
      window.removeEventListener('resize', actualizar)
      observador.disconnect()
    }
  }, [editor, contenedor])

  return caja
}
