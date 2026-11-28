'use client'

import type Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Punto } from '../../../entities/documento'
import type { Caja } from '../../../entities/editor/cajas'
import { idsParaElegir } from '../../../entities/editor/grupos'
import { ajustar, umbralDeAjuste, type Guia } from '../../../entities/editor/guias'
import { cajaMovida, cajasParaAjustar, idsQueSeMueven } from '../../../entities/editor/lienzo'
import type { EditorDeArte } from '../tipos'
import { capaDelNodo, nodoDeLaCapa } from './nodos-del-lienzo'

type Arrastre = {
  principal: Konva.Node
  ids: string[]
  inicios: Map<string, Punto>
  nodos: Map<string, Konva.Node>
  otras: Caja[]
}

type Args = { editor: EditorDeArte; stage: Konva.Stage | null; escala: number }

// Lo que se arrastra: lo elegido si la capa agarrada es parte (si no, ella con su grupo), sin lo bloqueado ni lo oculto.
function empezar(args: Args, stage: Konva.Stage, principal: Konva.Node): Arrastre | null {
  const { pagina, estado } = args.editor
  const id = principal.id()
  const elegidas = estado.seleccion.includes(id)
    ? estado.seleccion
    : idsParaElegir(pagina, id, false)
  const ids = idsQueSeMueven(pagina, elegidas)
  const nodos = new Map<string, Konva.Node>()
  for (const otro of ids) {
    const nodo = otro === id ? principal : nodoDeLaCapa(stage, otro)
    if (nodo) {
      nodos.set(otro, nodo)
    }
  }
  if (!nodos.has(id)) {
    return null
  }
  const inicios = new Map([...nodos].map(([otro, nodo]) => [otro, nodo.position()]))
  return { principal, ids, inicios, nodos, otras: cajasParaAjustar(pagina, ids) }
}

// Arrastrar capas: todo lo elegido se mueve junto, se ajusta a las guías inteligentes (el borde o el centro de lo movido contra los del
// documento y las demás capas) y al soltar es un solo `mover`. Los eventos llegan al Stage: un arrastre del Stage o de algo de la interfaz
// (las asas de la pluma) no es de capas.
export function useArrastreDeCapas(args: Args) {
  const [guias, setGuias] = useState<Guia[]>([])
  const ultimo = useRef(args)
  const arrastre = useRef<Arrastre | null>(null)

  useEffect(() => {
    ultimo.current = args
  })

  const alEmpezar = useCallback((e: KonvaEventObject<DragEvent>) => {
    const { stage } = ultimo.current
    const principal = capaDelNodo(e.target)
    if (e.target === e.target.getStage() || !stage || arrastre.current || principal !== e.target) {
      return
    }
    arrastre.current = empezar(ultimo.current, stage, principal)
  }, [])

  const alMover = useCallback((e: KonvaEventObject<DragEvent>) => {
    const a = arrastre.current
    const inicio = a?.inicios.get(e.target.id())
    if (!a || e.target !== a.principal || !inicio) {
      return
    }
    const { editor, escala } = ultimo.current
    const crudo = { x: a.principal.x() - inicio.x, y: a.principal.y() - inicio.y }
    const movida = cajaMovida(editor.pagina, a.ids, crudo)
    const ajuste = movida
      ? ajustar(movida, a.otras, editor.medidas, umbralDeAjuste(escala))
      : { dx: 0, dy: 0, guias: [] }
    for (const [id, nodo] of a.nodos) {
      const desde = a.inicios.get(id)
      if (desde) {
        nodo.position({ x: desde.x + crudo.x + ajuste.dx, y: desde.y + crudo.y + ajuste.dy })
      }
    }
    setGuias(ajuste.guias)
  }, [])

  const alSoltar = useCallback((e: KonvaEventObject<DragEvent>) => {
    const a = arrastre.current
    const inicio = a?.inicios.get(e.target.id())
    if (!a || e.target !== a.principal || !inicio) {
      return
    }
    arrastre.current = null
    setGuias([])
    const dx = a.principal.x() - inicio.x
    const dy = a.principal.y() - inicio.y
    if (dx !== 0 || dy !== 0) {
      ultimo.current.editor.despachar({ tipo: 'mover', ids: a.ids, dx, dy })
    }
  }, [])

  return { guias, alEmpezar, alMover, alSoltar }
}
