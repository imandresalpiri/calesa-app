'use client'

import type Konva from 'konva'
import type { Punto } from '../../../entities/documento'

// El nombre que lleva el nodo raíz de cada capa en el lienzo (su `id` es el de la capa). Lo de la interfaz (asas, guías, el Transformer)
// no lo lleva.
export const NOMBRE_DE_LA_CAPA = 'capa'
// La capa de Konva de la interfaz: se oculta al exportar.
export const NOMBRE_DE_LA_INTERFAZ = 'interfaz'
// Lo que no es la imagen de una capa (la espera, la que no cargó): tampoco sale en lo exportado.
export const NOMBRE_DEL_RESPALDO = 'respaldo-de-imagen'

// El nodo de la capa a la que pertenece lo que recibió un evento (una imagen es un grupo: el evento llega a uno de sus hijos); nulo si es
// el Stage o algo de la interfaz.
export function capaDelNodo(nodo: Konva.Node | null): Konva.Node | null {
  let actual: Konva.Node | null = nodo
  while (actual) {
    if (actual.hasName(NOMBRE_DE_LA_CAPA)) {
      return actual
    }
    actual = actual.getParent()
  }
  return null
}

// El nodo de una capa por su id (con una función: un id del documento puede tener caracteres que un selector de Konva lee distinto).
export function nodoDeLaCapa(stage: Konva.Stage, id: string): Konva.Node | undefined {
  return stage.findOne((nodo: Konva.Node) => nodo.hasName(NOMBRE_DE_LA_CAPA) && nodo.id() === id)
}

// Dónde está un evento del puntero dentro del área del lienzo, en px de pantalla.
export function enElArea(stage: Konva.Stage, evento: { clientX: number; clientY: number }): Punto {
  const area = stage.container().getBoundingClientRect()
  return { x: evento.clientX - area.left, y: evento.clientY - area.top }
}
