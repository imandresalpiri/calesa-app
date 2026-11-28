'use client'

import type Konva from 'konva'
import type { RefObject } from 'react'
import { avisar } from '@/shared/ui/toasts'
import type { Punto } from '../../../entities/documento'
import { hayLugar, MENSAJE_DEL_TOPE_DE_CAPAS } from '../../../entities/editor/acciones-de-capas'
import { alDocumento } from '../../../entities/editor/camara'
import type { Caja } from '../../../entities/editor/cajas'
import {
  cajaDeArrastre,
  capaDibujada,
  esClic,
  type HerramientaDeDibujo,
} from '../../../entities/editor/lienzo'
import type { CamaraDelEditor, EditorDeArte } from '../tipos'
import { enElArea } from './nodos-del-lienzo'
import { seguirElPuntero } from './seguir-el-puntero'

// Lo que se dibuja encima mientras dura un gesto: el recuadro que elige o la forma que se está por crear.
export type Boceto =
  | { tipo: 'recuadro'; caja: Caja }
  | { tipo: 'caja'; herramienta: Exclude<HerramientaDeDibujo, 'linea'>; caja: Caja }
  | { tipo: 'linea'; desde: Punto; hasta: Punto }

// Lo último que llegó por props (los gestos siguen el puntero por la ventana y leen siempre lo vigente).
export type Vigente = {
  editor: EditorDeArte
  camara: CamaraDelEditor
  alUsarHerramienta: () => void
  empezarTexto: (id: string) => void
}

export type Gestos = {
  vigente: RefObject<Vigente>
  stage: Konva.Stage
  ponerBoceto: (boceto: Boceto | null) => void
  ponerPaneando: (paneando: boolean) => void
}

const enElDocumento = (g: Gestos, evento: PointerEvent): Punto =>
  alDocumento(g.vigente.current.camara.camara, enElArea(g.stage, evento))

// La mano (la herramienta, Espacio o el botón del medio): arrastrar desplaza la cámara.
export function panear(g: Gestos, evento: PointerEvent) {
  let anterior = { x: evento.clientX, y: evento.clientY }
  g.ponerPaneando(true)
  seguirElPuntero({
    alMover: (e) => {
      g.vigente.current.camara.desplazar(e.clientX - anterior.x, e.clientY - anterior.y)
      anterior = { x: e.clientX, y: e.clientY }
    },
    alSoltar: () => {
      g.ponerPaneando(false)
    },
  })
}

function bocetoDe(herramienta: HerramientaDeDibujo, desde: Punto, hasta: Punto, cuadrada: boolean) {
  return herramienta === 'linea'
    ? ({ tipo: 'linea', desde, hasta } as const)
    : ({ tipo: 'caja', herramienta, caja: cajaDeArrastre(desde, hasta, cuadrada) } as const)
}

// Texto, rectángulo, elipse, polígono o línea: un clic deja la capa de su tamaño de siempre centrada en el punto; arrastrar, la caja (con
// Mayús, cuadrada). Después vuelve a «mover» y, si es un texto, empieza a escribirse.
export function dibujar(g: Gestos, herramienta: HerramientaDeDibujo, evento: PointerEvent) {
  if (!hayLugar(g.vigente.current.editor.pagina)) {
    avisar(MENSAJE_DEL_TOPE_DE_CAPAS)
    return
  }
  const inicio = enElArea(g.stage, evento)
  const desde = enElDocumento(g, evento)
  seguirElPuntero({
    alMover: (e) => {
      if (!esClic(inicio, enElArea(g.stage, e))) {
        g.ponerBoceto(bocetoDe(herramienta, desde, enElDocumento(g, e), e.shiftKey))
      }
    },
    alSoltar: (e) => {
      g.ponerBoceto(null)
      if (!e) {
        return
      }
      const hasta = esClic(inicio, enElArea(g.stage, e)) ? null : enElDocumento(g, e)
      const { editor, alUsarHerramienta, empezarTexto } = g.vigente.current
      const id = crypto.randomUUID()
      const capa = capaDibujada(
        herramienta,
        { desde, hasta, cuadrada: e.shiftKey },
        { id, medidas: editor.medidas },
      )
      editor.despachar({ tipo: 'agregar', capas: [capa] })
      alUsarHerramienta()
      if (capa.tipo === 'texto') {
        empezarTexto(id)
      }
    },
  })
}

// Con «mover», apretar fuera de las capas: un clic suelta lo elegido (con Mayús, lo deja) y arrastrar elige lo que toca el recuadro (con
// Mayús, lo suma).
export function recuadro(g: Gestos, evento: PointerEvent) {
  const inicio = enElArea(g.stage, evento)
  const desde = enElDocumento(g, evento)
  let movido = false
  seguirElPuntero({
    alMover: (e) => {
      movido ||= !esClic(inicio, enElArea(g.stage, e))
      if (movido) {
        g.ponerBoceto({ tipo: 'recuadro', caja: cajaDeArrastre(desde, enElDocumento(g, e)) })
      }
    },
    alSoltar: (e) => {
      g.ponerBoceto(null)
      const { editor } = g.vigente.current
      if (!movido) {
        if (!evento.shiftKey) {
          editor.despachar({ tipo: 'elegir', ids: [], modo: 'reemplazar' })
        }
        return
      }
      if (e) {
        const caja = cajaDeArrastre(desde, enElDocumento(g, e))
        const sumar = evento.shiftKey || e.shiftKey
        editor.despachar({ tipo: 'elegirEnRecuadro', recuadro: caja, sumar })
      }
    },
  })
}
