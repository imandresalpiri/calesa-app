'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { CapaDe, NodoDelTrazo, Punto } from '../../../entities/documento'
import {
  agregarNodo,
  normalizar,
  quitarNodo,
  segmentoMasCercano,
} from '../../../entities/editor/pluma'
import type { EditorDeArte } from '../tipos'

// Cuánto cerca de la curva (para sumar un nodo con doble clic), en px de pantalla.
const RADIO_EN_PANTALLA = 8

export type NodoElegido = { id: string; indice: number }

// La edición de los nodos de un trazo elegido: elegir un nodo (Supr lo quita), moverlo o mover sus asas y sumar uno con doble clic sobre la
// curva. Cada cambio de un mismo gesto se funde en un paso del historial; el último rehace la caja (`normalizar`).
export function useNodosDelTrazo(editor: EditorDeArte, escala: number) {
  const [elegido, setElegido] = useState<NodoElegido | null>(null)
  const ultimo = useRef({ editor, escala, elegido })
  const gesto = useRef(0)

  useEffect(() => {
    ultimo.current = { editor, escala, elegido }
  }, [editor, escala, elegido])

  const empezarAEditar = useCallback(() => {
    gesto.current = Date.now()
  }, [])

  const editar = useCallback(
    (id: string, cambio: (nodos: readonly NodoDelTrazo[]) => NodoDelTrazo[], final: boolean) => {
      const inicio = gesto.current
      ultimo.current.editor.despachar({
        tipo: 'cambiar',
        ids: [id],
        cambio: (c) => {
          if (c.tipo !== 'trazo') {
            return c
          }
          const nueva = { ...c, nodos: cambio(c.nodos) }
          return final ? normalizar(nueva) : nueva
        },
        fusion: { clave: `pluma:${id}:${String(inicio)}`, en: inicio },
      })
    },
    [],
  )

  const agregarNodoEn = useCallback(
    (capa: CapaDe<'trazo'>, punto: Punto) => {
      const cercano = segmentoMasCercano(capa.nodos, capa.cerrado, punto)
      if (!cercano || cercano.distancia > RADIO_EN_PANTALLA / ultimo.current.escala) {
        return
      }
      empezarAEditar()
      editar(
        capa.id,
        (nodos) => agregarNodo(nodos, capa.cerrado, cercano.segmento, cercano.t),
        true,
      )
      setElegido({ id: capa.id, indice: cercano.segmento + 1 })
    },
    [editar, empezarAEditar],
  )

  // Supr con un nodo elegido: lo quita (un trazo no baja de 2 nodos; con 2, Supr quita la capa).
  const quitarElegido = useCallback((): boolean => {
    const { elegido: nodo, editor: actual } = ultimo.current
    const capa = nodo && actual.pagina.capas.find((c) => c.id === nodo.id)
    if (!nodo || capa?.tipo !== 'trazo' || capa.nodos.length <= 2) {
      return false
    }
    empezarAEditar()
    editar(nodo.id, (nodos) => quitarNodo([...nodos], nodo.indice), true)
    setElegido(null)
    return true
  }, [editar, empezarAEditar])

  const seleccion = editor.estado.seleccion
  const vigente = elegido && seleccion.length === 1 && seleccion[0] === elegido.id ? elegido : null

  return {
    elegido: vigente,
    elegirNodo: setElegido,
    empezarAEditar,
    editar,
    agregarNodoEn,
    quitarElegido,
  }
}
