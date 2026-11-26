'use client'

import type { Editor } from '@tiptap/react'
import { MAXIMO_DE_IMAGENES_DE_LA_GALERIA } from '../../../../entities/contenido/doc'
import {
  agregarFotoALaGaleria,
  cambiarAtributos,
  fotosDeLaGaleria,
  ponerRutaDeLaSubida,
} from './comandos'
import { cuantasPendientes, nuevoGrupoDeSubidas, subirImagenes } from './subidas.client'

// Cuántas fotos más caben en la galería que ocupa el lugar `indice` (las que ya tiene y las que suben cuentan).
export function cupoDeLaGaleria(editor: Editor, indice: number): number {
  const nodo = editor.state.doc.maybeChild(indice)
  if (nodo === null || nodo.type.name !== 'gallery') {
    return 0
  }
  const grupo = typeof nodo.attrs['subida'] === 'string' ? nodo.attrs['subida'] : null
  const subiendo = grupo === null ? 0 : cuantasPendientes(grupo)
  return Math.max(0, MAXIMO_DE_IMAGENES_DE_LA_GALERIA - fotosDeLaGaleria(nodo).length - subiendo)
}

// Sube fotos a la galería que está en el lugar `indice`; las que pasan del tope se dejan.
export function subirALaGaleria(editor: Editor, indice: number, archivos: readonly File[]): void {
  const nodo = editor.state.doc.maybeChild(indice)
  if (nodo === null || nodo.type.name !== 'gallery') {
    return
  }
  const elegidas = archivos.slice(0, cupoDeLaGaleria(editor, indice))
  if (elegidas.length === 0) {
    return
  }
  const actual: unknown = nodo.attrs['subida']
  const grupo = typeof actual === 'string' ? actual : nuevoGrupoDeSubidas()
  if (actual !== grupo) {
    cambiarAtributos(editor, indice, { subida: grupo })
  }
  subirImagenes(grupo, elegidas, (ruta) => {
    agregarFotoALaGaleria(editor, grupo, ruta)
  })
}

// Sube la foto que reemplaza a la de la imagen que está en el lugar `indice` (la vieja se ve hasta que la nueva llega).
export function reemplazarLaImagen(editor: Editor, indice: number, archivo: File): void {
  const grupo = nuevoGrupoDeSubidas()
  cambiarAtributos(editor, indice, { subida: grupo })
  subirImagenes(grupo, [archivo], (ruta) => {
    ponerRutaDeLaSubida(editor, grupo, ruta)
  })
}

// Sube las fotos de un bloque recién insertado (su atributo `subida` ya es `grupo`).
export function subirAlBloqueNuevo(
  editor: Editor,
  clave: 'imagen' | 'galeria',
  grupo: string,
  archivos: readonly File[],
): void {
  const elegidas =
    clave === 'imagen' ? archivos.slice(0, 1) : archivos.slice(0, MAXIMO_DE_IMAGENES_DE_LA_GALERIA)
  subirImagenes(grupo, elegidas, (ruta) => {
    if (clave === 'imagen') {
      ponerRutaDeLaSubida(editor, grupo, ruta)
    } else {
      agregarFotoALaGaleria(editor, grupo, ruta)
    }
  })
}
