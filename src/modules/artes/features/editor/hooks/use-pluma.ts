'use client'

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { useAtajo } from '@/shared/ui/atajos'
import { avisar } from '@/shared/ui/toasts'
import {
  MAXIMO_DE_NODOS_POR_TRAZO,
  type NodoDelTrazo,
  type Punto,
} from '../../../entities/documento'
import { hayLugar, MENSAJE_DEL_TOPE_DE_CAPAS } from '../../../entities/editor/acciones-de-capas'
import type { HerramientaDelEditor } from '../../../entities/editor/atajos'
import { ARRASTRE_MINIMO, trazoNuevo } from '../../../entities/editor/lienzo'
import { moverAsa, tocaElPrimero } from '../../../entities/editor/pluma'
import type { EditorDeArte } from '../tipos'
import { seguirElPuntero } from './seguir-el-puntero'
import { useNodosDelTrazo } from './use-nodos-del-trazo'

// Cuánto cerca del primer nodo para cerrar el trazo, en px de pantalla.
const RADIO_EN_PANTALLA = 8

// El trazo que se está dibujando: sus nodos en unidades del documento y dónde está el puntero (el tramo que seguiría).
export type TrazoEnCurso = { nodos: NodoDelTrazo[]; puntero: Punto | null }

type Args = {
  editor: EditorDeArte
  herramienta: HerramientaDelEditor
  escala: number
  alUsarHerramienta: () => void
}

type Ultimo = {
  editor: EditorDeArte
  escala: number
  alUsarHerramienta: () => void
  enCurso: TrazoEnCurso | null
}
type Dibujo = {
  ultimo: RefObject<Ultimo>
  poner: (trazo: TrazoEnCurso | null) => void
  terminar: (cerrado?: boolean, volver?: boolean) => boolean
}

const nodoEn = (p: Punto): NodoDelTrazo => ({ x: p.x, y: p.y, entrada: null, salida: null })
const lejos = (a: Punto, b: Punto, radio: number) => Math.hypot(a.x - b.x, a.y - b.y) > radio

// Tras el clic, arrastrar tira de las asas del nodo `i`, simétricas. Al llegar al tope de nodos, el trazo termina.
function tirarDeLasAsas(
  { ultimo, poner, terminar }: Dibujo,
  i: number,
  aDocumento: (e: PointerEvent) => Punto,
) {
  seguirElPuntero({
    alMover: (evento) => {
      const trazo = ultimo.current.enCurso
      const nodo = trazo?.nodos[i]
      const punto = aDocumento(evento)
      if (trazo && nodo && lejos(nodo, punto, ARRASTRE_MINIMO / ultimo.current.escala)) {
        poner({ ...trazo, nodos: moverAsa(trazo.nodos, i, { lado: 'salida', punto }, true) })
      }
    },
    alSoltar: () => {
      if ((ultimo.current.enCurso?.nodos.length ?? 0) >= MAXIMO_DE_NODOS_POR_TRAZO) {
        terminar()
      }
    },
  })
}

// Un clic de la pluma: empieza el trazo (si la página tiene lugar), lo cierra sobre el primer nodo o suma un nodo.
function bajar(dibujo: Dibujo, punto: Punto, aDocumento: (e: PointerEvent) => Punto) {
  const { enCurso: trazo, editor, escala } = dibujo.ultimo.current
  if (!trazo) {
    if (!hayLugar(editor.pagina)) {
      avisar(MENSAJE_DEL_TOPE_DE_CAPAS)
      return
    }
    dibujo.poner({ nodos: [nodoEn(punto)], puntero: null })
    tirarDeLasAsas(dibujo, 0, aDocumento)
    return
  }
  if (tocaElPrimero(trazo.nodos, punto, RADIO_EN_PANTALLA / escala)) {
    dibujo.terminar(true)
    return
  }
  dibujo.poner({ nodos: [...trazo.nodos, nodoEn(punto)], puntero: null })
  tirarDeLasAsas(dibujo, trazo.nodos.length, aDocumento)
}

// La pluma: un clic suma un nodo, arrastrar tira de sus asas, un clic en el primero lo cierra y Enter o Esc lo terminan. Lo dibujado no
// entra al documento hasta terminar (un solo paso del historial) y al cambiar de herramienta se guarda. Con un trazo elegido, sus nodos se
// editan (`useNodosDelTrazo`).
export function usePluma({ editor, herramienta, escala, alUsarHerramienta }: Args) {
  const [enCurso, setEnCurso] = useState<TrazoEnCurso | null>(null)
  const ultimo = useRef<Ultimo>({ editor, escala, alUsarHerramienta, enCurso })
  const nodos = useNodosDelTrazo(editor, escala)

  useEffect(() => {
    ultimo.current = { ...ultimo.current, editor, escala, alUsarHerramienta }
  }, [editor, escala, alUsarHerramienta])

  const poner = useCallback((trazo: TrazoEnCurso | null) => {
    ultimo.current = { ...ultimo.current, enCurso: trazo }
    setEnCurso(trazo)
  }, [])

  const terminar = useCallback(
    // `volver`: vuelve a «mover» (no, si se terminó porque se eligió otra herramienta).
    (cerrado = false, volver = true): boolean => {
      const { enCurso: trazo, editor: actual } = ultimo.current
      if (!trazo) {
        return false
      }
      poner(null)
      if (trazo.nodos.length >= 2) {
        const id = crypto.randomUUID()
        const capa = trazoNuevo(id, trazo.nodos, cerrado && trazo.nodos.length >= 3, actual.medidas)
        actual.despachar({ tipo: 'agregar', capas: [capa] })
        if (volver) {
          ultimo.current.alUsarHerramienta()
        }
      }
      return true
    },
    [poner],
  )

  useEffect(() => {
    if (herramienta !== 'pluma') {
      return
    }
    return () => {
      terminar(false, false)
    }
  }, [herramienta, terminar])

  useAtajo('cerrar', () => void terminar(), enCurso !== null)

  const alBajar = useCallback(
    (punto: Punto, aDocumento: (e: PointerEvent) => Punto) => {
      bajar({ ultimo, poner, terminar }, punto, aDocumento)
    },
    [poner, terminar],
  )

  const alMoverSinApretar = useCallback(
    (punto: Punto) => {
      const trazo = ultimo.current.enCurso
      if (trazo) {
        poner({ ...trazo, puntero: punto })
      }
    },
    [poner],
  )

  // Supr: mientras se dibuja quita el último nodo; si no, el nodo elegido de un trazo.
  const { quitarElegido } = nodos
  const quitar = useCallback((): boolean => {
    const trazo = ultimo.current.enCurso
    if (!trazo) {
      return quitarElegido()
    }
    poner(trazo.nodos.length > 1 ? { ...trazo, nodos: trazo.nodos.slice(0, -1) } : null)
    return true
  }, [poner, quitarElegido])

  return {
    ...nodos,
    enCurso: herramienta === 'pluma' ? enCurso : null,
    alBajar,
    alMoverSinApretar,
    terminar,
    quitar,
  }
}

export type PlumaDelLienzo = ReturnType<typeof usePluma>
