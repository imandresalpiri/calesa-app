'use client'

import { useMemo } from 'react'
import type { ContextoDeHoja } from '../../../entities/binding'
import type {
  ClaveDePieza,
  Diseno,
  ItemSinPosicion,
  SeccionDeDiseno,
} from '../../../entities/diseno'
import { MOTIVO_DE_LA_ULTIMA_SECCION } from '../../../entities/diseno/insercion-del-diseno'
import {
  itemParaSumar,
  ofertasParaSumar,
  type OfertaParaSumar,
  type TipoParaSumar,
} from '../../../entities/diseno/ofertas-para-sumar'
import { destinoDeUnPaso, type DestinoDeLaPieza } from '../../../entities/diseno/orden-del-diseno'
import {
  mismaPieza,
  piezaDelItemDeLaHoja,
  textoDeLaPieza,
  type PiezaDeLaHoja,
} from '../../../entities/diseno/pieza-de-la-hoja'
import type { RechazoDelEditor } from './use-revision-del-diseno'
import type { EdicionesDelDiseno } from './use-ediciones-del-diseno'
import type { EditorDelDiseno } from './use-editor-del-diseno'
import { nombreDeLaPieza } from './operaciones-de-la-hoja'
import type { LugarDelId } from './ids-del-lienzo'

type Paso = -1 | 1

// Lo que el lienzo pasa a cada sección y a cada pieza: con qué se dibuja, qué está elegido o marcado y lo que se hace con ellas.
export type ApoyoDelLienzo = {
  contexto: ContextoDeHoja
  elegida: PiezaDeLaHoja | null
  // La pieza (su `?pieza=`) a la que apunta el rechazo de la revisión, con su mensaje.
  rechazo: { texto: string; mensaje: string } | null
  ocupado: boolean
  // Lo que se arrastra y dónde caería.
  activo: LugarDelId | null
  destino: DestinoDeLaPieza | null
  nombreDe: (clave: ClaveDePieza) => string
  puedeMover: (clave: ClaveDePieza) => { antes: boolean; despues: boolean }
  elegir: (pieza: PiezaDeLaHoja | null) => void
  moverUnPaso: (clave: ClaveDePieza, paso: Paso) => void
  ponerColumnas: (clave: ClaveDePieza, columnas: number) => void
  quitar: (clave: ClaveDePieza) => void
  ofertas: (seccion: SeccionDeDiseno) => OfertaParaSumar[]
  sumar: (seccion: string, indice: number, tipo: TipoParaSumar, nodo: string | null) => void
  moverSeccion: (id: string, paso: Paso) => void
  quitarSeccion: (id: string) => void
  // Por qué no se quita una sección (la única); nulo si se puede.
  motivoParaQuitarSeccion: string | null
}

// La sección vecina de la misma presentación (las principales y las avanzadas se dibujan en dos bloques: un paso que salta al otro no se vería): su índice.
export function vecinaDeLaSeccion(d: Diseno, id: string, paso: Paso): number | null {
  const i = d.secciones.findIndex((s) => s.id === id)
  const seccion = d.secciones[i]
  if (seccion === undefined) return null
  const candidatas = d.secciones
    .map((s, k) => ({ s, k }))
    .filter(({ s, k }) => s.presentacion === seccion.presentacion && (paso < 0 ? k < i : k > i))
  const vecina = paso < 0 ? candidatas.at(-1) : candidatas[0]
  return vecina?.k ?? null
}

// Lleva el foco al botón de la pieza tras moverla o sumarla con el teclado (cambiar de sección la vuelve a montar).
export function enfocarLaPieza(texto: string) {
  requestAnimationFrame(() => {
    document.querySelector<HTMLElement>(`[data-elegir="${CSS.escape(texto)}"]`)?.focus()
  })
}

const rechazoEnLaHoja = (rechazo: RechazoDelEditor | null) => {
  const lugar = rechazo?.enLaHoja ?? null
  return rechazo === null || lugar?.tipo !== 'pieza'
    ? null
    : { texto: textoDeLaPieza(lugar.pieza), mensaje: rechazo.mensaje }
}

type Args = {
  editor: EditorDelDiseno
  ediciones: EdicionesDelDiseno
  contexto: ContextoDeHoja
  elegida: PiezaDeLaHoja | null
  elegir: (pieza: PiezaDeLaHoja | null) => void
  arrastre: { activo: LugarDelId | null; destino: DestinoDeLaPieza | null }
  alAnunciar: (texto: string) => void
}

// Arma el apoyo del lienzo sobre el editor: mover un paso (y anunciarlo), sumar (y elegir lo sumado), quitar (y soltar lo quitado si estaba elegido).
export function useApoyoDelLienzo({
  editor,
  ediciones,
  contexto,
  elegida,
  elegir,
  arrastre,
  alAnunciar,
}: Args) {
  const { trabajo, definicion, nombresDeNodos } = editor
  const rechazo = useMemo(() => rechazoEnLaHoja(editor.rechazo), [editor.rechazo])
  const sumarPieza = (seccion: string, _indice: number, item: ItemSinPosicion) => {
    editor.sumar(seccion, item)
    const pieza = piezaDelItemDeLaHoja(item)
    elegir(pieza)
    enfocarLaPieza(textoDeLaPieza(pieza))
  }
  const apoyo: ApoyoDelLienzo = {
    contexto,
    elegida,
    rechazo,
    ocupado: editor.ocupado,
    activo: arrastre.activo,
    destino: arrastre.destino,
    nombreDe: (clave) => nombreDeLaPieza(clave, nombresDeNodos),
    puedeMover: (clave) => ({
      antes: destinoDeUnPaso(trabajo, clave, -1) !== null,
      despues: destinoDeUnPaso(trabajo, clave, 1) !== null,
    }),
    elegir,
    moverUnPaso: (clave, paso) => {
      const destino = destinoDeUnPaso(trabajo, clave, paso)
      const anuncio = destino === null ? null : editor.mover(clave, destino)
      if (anuncio === null) return
      alAnunciar(anuncio)
      enfocarLaPieza(textoDeLaPieza(piezaDelItemDeLaHoja(clave)))
    },
    ponerColumnas: ediciones.ponerColumnas,
    quitar: (clave) => {
      editor.quitar(clave)
      if (mismaPieza(elegida, piezaDelItemDeLaHoja(clave))) elegir(null)
    },
    ofertas: (seccion) => ofertasParaSumar(definicion, trabajo, seccion),
    sumar: (seccion, indice, tipo, nodo) => {
      if (tipo === 'total') sumarPieza(seccion, indice, { tipo: 'total' })
      else if (nodo !== null) sumarPieza(seccion, indice, itemParaSumar(definicion, tipo, nodo))
    },
    moverSeccion: (id, paso) => {
      const desde = trabajo.secciones.findIndex((s) => s.id === id)
      const hasta = vecinaDeLaSeccion(trabajo, id, paso)
      if (hasta === null) return
      ediciones.moverSeccion(desde, hasta)
      enfocarLaPieza(textoDeLaPieza({ pieza: 'seccion', seccion: id }))
    },
    quitarSeccion: (id) => {
      if (editor.quitarSeccion(id) !== null) return
      if (mismaPieza(elegida, { pieza: 'seccion', seccion: id })) elegir(null)
    },
    motivoParaQuitarSeccion: trabajo.secciones.length <= 1 ? MOTIVO_DE_LA_ULTIMA_SECCION : null,
  }
  return apoyo
}
