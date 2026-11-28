'use client'

import type Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Punto } from '../../../entities/documento'
import type { HerramientaDelEditor } from '../../../entities/editor/atajos'
import { alDocumento } from '../../../entities/editor/camara'
import { idsParaElegir } from '../../../entities/editor/grupos'
import { esClic, esDeDibujo } from '../../../entities/editor/lienzo'
import {
  dibujar,
  panear,
  recuadro,
  type Boceto,
  type Gestos,
  type Vigente,
} from './gestos-del-lienzo'
import { capaDelNodo, enElArea } from './nodos-del-lienzo'
import type { PlumaDelLienzo } from './use-pluma'

type Args = Vigente & {
  herramienta: HerramientaDelEditor
  // La herramienta «mano» o Espacio apretado.
  mano: boolean
  stage: Konva.Stage | null
  pluma: PlumaDelLienzo
}

// El clic que eligió al apretar: al soltar sin moverse, si ya estaba elegido, deja sólo eso (con Mayús, lo saca).
type Pendiente = { ids: string[]; yaEstaban: boolean; en: Punto }

type Evento = KonvaEventObject<PointerEvent>

// Apretar sobre una capa con «mover»: la elige (con Ctrl o ⌘, la de adentro del grupo; con Mayús, la suma) y deja anotado el clic.
function elegirAlApretar(args: Args, nodo: Konva.Node, evento: PointerEvent): Pendiente {
  const { pagina, estado, despachar } = args.editor
  const ids = idsParaElegir(pagina, nodo.id(), evento.ctrlKey || evento.metaKey)
  const yaEstaban = ids.every((id) => estado.seleccion.includes(id))
  if (!yaEstaban) {
    despachar({ tipo: 'elegir', ids, modo: evento.shiftKey ? 'sumar' : 'reemplazar' })
  }
  return { ids, yaEstaban, en: { x: evento.clientX, y: evento.clientY } }
}

// Doble clic con «mover»: un texto se escribe encima, un trazo elegido suma un nodo sobre la curva y, en un grupo, elige la capa de adentro.
function dobleClic(args: Args, nodo: Konva.Node) {
  const { pagina, estado, despachar } = args.editor
  const capa = pagina.capas.find((c) => c.id === nodo.id())
  if (!capa) {
    return
  }
  if (capa.tipo === 'texto') {
    despachar({ tipo: 'elegir', ids: [capa.id], modo: 'reemplazar' })
    args.empezarTexto(capa.id)
    return
  }
  const soloEse = estado.seleccion.length === 1 && estado.seleccion[0] === capa.id
  const punto = nodo.getRelativePointerPosition()
  if (capa.tipo === 'trazo' && soloEse && punto && !args.editor.soloLectura) {
    args.pluma.agregarNodoEn(capa, punto)
    return
  }
  despachar({ tipo: 'elegir', ids: idsParaElegir(pagina, capa.id, true), modo: 'reemplazar' })
}

// Apretar sobre el Stage, según la herramienta. Devuelve el clic que quedó pendiente (sólo al elegir una capa).
function apretar(a: Args, gestos: Gestos, e: Evento): Pendiente | null {
  const evento = e.evt
  if (evento.button !== 0 && evento.button !== 1) {
    return null
  }
  if (evento.button === 1 || a.mano) {
    evento.preventDefault()
    panear(gestos, evento)
    return null
  }
  if (a.herramienta === 'pluma') {
    const aDocumento = (p: PointerEvent) =>
      alDocumento(gestos.vigente.current.camara.camara, enElArea(gestos.stage, p))
    a.pluma.alBajar(aDocumento(evento), aDocumento)
    return null
  }
  if (esDeDibujo(a.herramienta)) {
    dibujar(gestos, a.herramienta, evento)
    return null
  }
  const nodo = capaDelNodo(e.target)
  if (nodo) {
    return elegirAlApretar(a, nodo, evento)
  }
  if (e.target === gestos.stage) {
    recuadro(gestos, evento)
  }
  return null
}

// El puntero sobre el Stage: la mano desplaza, la pluma suma nodos, las herramientas de dibujo crean su capa y «mover» elige (clic, Mayús,
// Ctrl o ⌘, doble clic, el recuadro). Arrastrar capas va aparte (`useArrastreDeCapas`). `encima`: la capa bajo el puntero (su contorno).
export function usePunteroDelLienzo(args: Args) {
  const [boceto, setBoceto] = useState<Boceto | null>(null)
  const [paneando, setPaneando] = useState(false)
  const [encima, setEncima] = useState<string | null>(null)
  const vigente = useRef<Args>(args)
  const pendiente = useRef<Pendiente | null>(null)

  useEffect(() => {
    vigente.current = args
  })

  const { stage } = args
  const gestos = useMemo<Gestos | null>(
    () => stage && { vigente, stage, ponerBoceto: setBoceto, ponerPaneando: setPaneando },
    [stage],
  )

  const alApretar = useCallback(
    (e: Evento) => {
      pendiente.current = gestos ? apretar(vigente.current, gestos, e) : null
    },
    [gestos],
  )

  const alClic = useCallback((e: Evento) => {
    const p = pendiente.current
    pendiente.current = null
    const enPantalla = { x: e.evt.clientX, y: e.evt.clientY }
    const sobre = capaDelNodo(e.target)?.id()
    if (p?.yaEstaban && sobre !== undefined && p.ids.includes(sobre) && esClic(p.en, enPantalla)) {
      vigente.current.editor.despachar({
        tipo: 'elegir',
        ids: p.ids,
        modo: e.evt.shiftKey ? 'alternar' : 'reemplazar',
      })
    }
  }, [])

  const alDobleClic = useCallback((e: Evento) => {
    const nodo = capaDelNodo(e.target)
    const a = vigente.current
    if (nodo && a.herramienta === 'mover' && !a.mano) {
      dobleClic(a, nodo)
    }
  }, [])

  const alEntrar = useCallback((e: Evento) => {
    setEncima(capaDelNodo(e.target)?.id() ?? null)
  }, [])

  const alSalir = useCallback(() => {
    setEncima(null)
  }, [])

  const alMover = useCallback(
    (e: Evento) => {
      const a = vigente.current
      if (gestos && a.pluma.enCurso) {
        a.pluma.alMoverSinApretar(alDocumento(a.camara.camara, enElArea(gestos.stage, e.evt)))
      }
    },
    [gestos],
  )

  return { boceto, paneando, encima, alApretar, alClic, alDobleClic, alEntrar, alSalir, alMover }
}

export type PunteroDelLienzo = ReturnType<typeof usePunteroDelLienzo>
