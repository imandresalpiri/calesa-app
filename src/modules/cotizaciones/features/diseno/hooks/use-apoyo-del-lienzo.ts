'use client'

import { useMemo } from 'react'
import type { ContextoDeHoja } from '../../../entities/binding'
import type { ClaveDePieza, Posicion, SeccionDeDiseno } from '../../../entities/diseno'
import type { ItemSinPosicion } from '../../../entities/diseno-sin-posicion'
import type { Nombrar } from '../../../entities/diseno/anuncios-de-la-rejilla'
import { MOTIVO_DE_LA_ULTIMA_SECCION } from '../../../entities/diseno/insercion-del-diseno'
import { lugarDe, type Tamano } from '../../../entities/diseno/lugar-en-la-rejilla'
import { destinoEnLaVecina, type Direccion } from '../../../entities/diseno/mover-en-la-rejilla'
import {
  itemParaSumar,
  ofertasParaSumar,
  type OfertaParaSumar,
  type TipoParaSumar,
} from '../../../entities/diseno/ofertas-para-sumar'
import {
  mismaPieza,
  piezaDelItemDeLaHoja,
  textoDeLaPieza,
  type PiezaDeLaHoja,
} from '../../../entities/diseno/pieza-de-la-hoja'
import { tamanoQueEntra } from '../../../entities/diseno/tamano-en-la-rejilla'
import type { PiezaEnLaRejilla } from '../../../entities/rejilla-de-la-hoja'
import type { MarcaDibujada } from './caida-bajo-el-punto'
import type { RechazoDelEditor } from './use-revision-del-diseno'
import type { EditorDelDiseno } from './use-editor-del-diseno'

type Paso = -1 | 1

// Lo que el lienzo pasa a cada sección y a cada pieza: con qué se dibuja, qué está elegido o marcado y lo que se hace con ellas.
export type ApoyoDelLienzo = {
  contexto: ContextoDeHoja
  elegida: PiezaDeLaHoja | null
  // La pieza (su `?pieza=`) a la que apunta el rechazo de la revisión, con su mensaje.
  rechazo: { texto: string; mensaje: string } | null
  ocupado: boolean
  // El id de lo que se arrastra y la marca de dónde caería.
  activo: string | null
  marca: MarcaDibujada | null
  nombrar: Nombrar
  elegir: (pieza: PiezaDeLaHoja | null) => void
  moverConTeclas: (p: PiezaDeLaHoja, direccion: Direccion) => void
  // Si hay una sección antes o después donde entre (el «⋯» de la pieza).
  hayVecina: (p: PiezaDeLaHoja, paso: Paso) => boolean
  moverALaVecina: (p: PiezaDeLaHoja, paso: Paso) => void
  // Dónde está y cuánto mide en la rejilla (nulo: la cabecera o lo que no tiene lugar).
  lugarDe: (p: PiezaDeLaHoja) => PiezaEnLaRejilla | null
  // Lo que entraría de lo pedido (lo que muestra el borde mientras se arrastra).
  tamanoQueEntra: (p: PiezaDeLaHoja, pedido: Partial<Tamano>) => Tamano | null
  // El borde: pone lo que entra y lo anuncia. Alt+Shift+flechas: una columna o una fila más o menos.
  cambiarTamano: (p: PiezaDeLaHoja, pedido: Partial<Tamano>) => void
  cambiarTamanoUnPaso: (p: PiezaDeLaHoja, lado: keyof Tamano, paso: Paso) => void
  quitar: (clave: ClaveDePieza) => void
  ofertas: (seccion: SeccionDeDiseno) => OfertaParaSumar[]
  // Al primer lugar libre de la sección (con `despues`, el primero después de esa posición: el «+» de la pieza elegida).
  sumar: (
    seccion: string,
    despues: Posicion | null,
    tipo: TipoParaSumar,
    nodo: string | null,
  ) => void
  quitarSeccion: (id: string) => void
  // Por qué no se quita una sección (la única); nulo si se puede.
  motivoParaQuitarSeccion: string | null
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
  contexto: ContextoDeHoja
  elegida: PiezaDeLaHoja | null
  elegir: (pieza: PiezaDeLaHoja | null) => void
  nombrar: Nombrar
  arrastre: { activo: string | null; marca: MarcaDibujada | null }
  alAnunciar: (texto: string) => void
}

// Arma el apoyo del lienzo sobre el editor: mover con el teclado o a la vecina (y anunciarlo, con el foco en la pieza), sumar (y elegir lo sumado), quitar (y
// soltar lo quitado si estaba elegido).
export function useApoyoDelLienzo({
  editor,
  contexto,
  elegida,
  elegir,
  nombrar,
  arrastre,
  alAnunciar,
}: Args) {
  const { trabajo, definicion } = editor
  const rechazo = useMemo(() => rechazoEnLaHoja(editor.rechazo), [editor.rechazo])
  const sumarPieza = (seccion: string, despues: Posicion | null, item: ItemSinPosicion) => {
    editor.sumar(seccion, item, despues ?? undefined)
    const pieza = piezaDelItemDeLaHoja(item)
    elegir(pieza)
    enfocarLaPieza(textoDeLaPieza(pieza))
  }
  const anunciarYEnfocar = (p: PiezaDeLaHoja, anuncio: string | null) => {
    if (anuncio !== null) alAnunciar(anuncio)
    enfocarLaPieza(textoDeLaPieza(p))
  }
  const apoyo: ApoyoDelLienzo = {
    contexto,
    elegida,
    rechazo,
    ocupado: editor.ocupado,
    activo: arrastre.activo,
    marca: arrastre.marca,
    nombrar,
    elegir,
    moverConTeclas: (p, direccion) => {
      anunciarYEnfocar(p, editor.moverConTeclas(p, direccion))
    },
    hayVecina: (p, paso) => destinoEnLaVecina(trabajo, p, paso) !== null,
    moverALaVecina: (p, paso) => {
      anunciarYEnfocar(p, editor.moverALaVecina(p, paso))
    },
    lugarDe: (p) => lugarDe(trabajo, p)?.pieza ?? null,
    tamanoQueEntra: (p, pedido) => tamanoQueEntra(trabajo, p, pedido)?.tamano ?? null,
    cambiarTamano: (p, pedido) => {
      anunciarYEnfocar(p, editor.cambiarElTamano(p, pedido))
    },
    cambiarTamanoUnPaso: (p, lado, paso) => {
      const hay = lugarDe(trabajo, p)?.pieza
      const pedido =
        hay === undefined
          ? {}
          : lado === 'ancho'
            ? { ancho: hay.ancho + paso }
            : { alto: hay.alto + paso }
      anunciarYEnfocar(p, editor.cambiarElTamano(p, pedido))
    },
    quitar: (clave) => {
      editor.quitar(clave)
      if (mismaPieza(elegida, piezaDelItemDeLaHoja(clave))) elegir(null)
    },
    ofertas: (seccion) => ofertasParaSumar(definicion, trabajo, seccion),
    sumar: (seccion, despues, tipo, nodo) => {
      if (tipo === 'total') sumarPieza(seccion, despues, { tipo: 'total' })
      else if (nodo !== null) sumarPieza(seccion, despues, itemParaSumar(definicion, tipo, nodo))
    },
    quitarSeccion: (id) => {
      if (editor.quitarSeccion(id) !== null) return
      if (mismaPieza(elegida, { pieza: 'seccion', seccion: id })) elegir(null)
    },
    motivoParaQuitarSeccion: trabajo.secciones.length <= 1 ? MOTIVO_DE_LA_ULTIMA_SECCION : null,
  }
  return apoyo
}
