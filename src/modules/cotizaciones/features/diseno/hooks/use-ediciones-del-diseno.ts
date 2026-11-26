'use client'

import { useMemo } from 'react'
import type { ClaveDePieza, Diseno, SeccionDeDiseno } from '../../../entities/diseno'
import type { PorDefecto } from '../../../entities/cabecera-por-defecto'
import { ponerColumnas } from '../../../entities/diseno/ancho-de-la-pieza'
import {
  ponerModo,
  ponerPorDefecto,
  ponerVerTotalBs,
  quitarModo,
  sumarModo,
  type CambioDeModo,
} from '../../../entities/diseno/edicion-de-la-cabecera'
import {
  alternarSecundario,
  ponerTotalDeLaTarjeta,
} from '../../../entities/diseno/edicion-de-la-tarjeta'
import { ponerAtajos, ponerEfecto } from '../../../entities/diseno/edicion-de-items'
import {
  ponerAspectoDeItem,
  ponerAspectoDeLaCabecera,
  ponerAspectoDeSeccion,
  type CambioDeAspectoDeItem,
  type CambioDeAspectoDeLaCabecera,
  type CambioDeAspectoDeSeccion,
} from '../../../entities/diseno/edicion-del-aspecto'
import { ponerSeccion } from '../../../entities/diseno/edicion-del-diseno'
import { ponerNiveles, type CambioDeNiveles } from '../../../entities/diseno/niveles'
import { ubicarElTotal } from '../../../entities/diseno/total-de-la-hoja'
import type { Definicion } from '../../../entities/formula'
import { edicionesDeLaAyuda } from './ediciones-de-la-ayuda'

export type EdicionesDelDiseno = ReturnType<typeof edicionesDelDiseno>

// Las operaciones puras de piezas, secciones, cabecera, tarjeta y aspecto, atadas a `aplicar` del editor: ningún componente llama a una operación pura directo.
// Una pieza se nombra por su `ClaveDePieza` (su sección y su nodo, o la tarjeta del total).
function edicionesDelDiseno(
  aplicar: (cambio: (d: Diseno) => Diseno) => void,
  definicion: Definicion,
) {
  return {
    ponerSeccion: (
      seccion: string,
      cambios: { titulo?: string; presentacion?: SeccionDeDiseno['presentacion'] },
    ) => {
      aplicar((d) => ponerSeccion(d, seccion, cambios))
    },
    // Sin `nodo`, los de la sección; con él, los de su celda.
    ponerNiveles: (seccion: string, nodo: string | undefined, cambios: CambioDeNiveles) => {
      aplicar((d) => ponerNiveles(d, nodo === undefined ? { seccion } : { seccion, nodo }, cambios))
    },
    ponerColumnas: (clave: ClaveDePieza, columnas: number) => {
      aplicar((d) => ponerColumnas(d, clave, columnas))
    },
    ponerAtajos: (seccion: string, nodo: string, cambios: { columna?: string; filas?: number }) => {
      aplicar((d) => ponerAtajos(d, seccion, nodo, cambios))
    },
    ponerEfecto: (seccion: string, nodo: string, efecto: Parameters<typeof ponerEfecto>[3]) => {
      aplicar((d) => ponerEfecto(d, seccion, nodo, efecto))
    },
    // Los bloques de la ayuda de una celda.
    ayuda: edicionesDeLaAyuda(aplicar),
    ponerVerTotalBs: (valor: boolean) => {
      aplicar((d) => ponerVerTotalBs(d, valor))
    },
    ponerPorDefecto: (pd: PorDefecto) => {
      aplicar((d) => ponerPorDefecto(d, pd))
    },
    sumarModo: (nombre: string) => {
      aplicar((d) => sumarModo(definicion, d, nombre))
    },
    ponerModo: (clave: string, cambios: CambioDeModo) => {
      aplicar((d) => ponerModo(d, clave, cambios))
    },
    quitarModo: (clave: string) => {
      aplicar((d) => quitarModo(d, clave))
    },
    ponerTotal: (nodo: string) => {
      aplicar((d) => ponerTotalDeLaTarjeta(d, nodo))
    },
    alternarSecundario: (nodo: string) => {
      aplicar((d) => alternarSecundario(d, nodo))
    },
    // «Ubicar en la hoja» de un diseño sin la pieza del total.
    ubicarElTotal: () => {
      aplicar(ubicarElTotal)
    },
    ponerAspectoDeSeccion: (seccion: string, cambios: CambioDeAspectoDeSeccion) => {
      aplicar((d) => ponerAspectoDeSeccion(d, seccion, cambios))
    },
    ponerAspectoDeItem: (clave: ClaveDePieza, cambios: CambioDeAspectoDeItem) => {
      aplicar((d) => ponerAspectoDeItem(d, clave.seccion, clave, cambios))
    },
    ponerAspectoDeLaCabecera: (cambios: CambioDeAspectoDeLaCabecera) => {
      aplicar((d) => ponerAspectoDeLaCabecera(d, cambios))
    },
  }
}

export function useEdicionesDelDiseno(
  aplicar: (cambio: (d: Diseno) => Diseno) => void,
  definicion: Definicion,
) {
  return useMemo(() => edicionesDelDiseno(aplicar, definicion), [aplicar, definicion])
}
