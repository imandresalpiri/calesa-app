// Las secciones del lienzo del editor de la hoja: cada sección del diseño con sus piezas como las dibuja la hoja (`itemDe()`, el espejo de `_cotizacion_hoja()`),
// alineadas una a una con los ítems del diseño (la posición k del lienzo es el ítem k de la sección: lo que se arrastra o se elige apunta a él). Una pieza cuyo
// nodo ya no está en la fórmula queda nula (el lienzo la dibuja marcada, con «Quitar la pieza»); una sección vacía se dibuja igual (con su «+»). La rejilla de
// cada sección es la de la hoja (`rejillaDeLasPiezas()`) con la fila del «+» debajo de la última: así el «+» nunca tapa un hueco. Puras.
import { aspectoDeSeccion } from '../aspecto-de-la-hoja'
import {
  COLUMNAS_DE_LA_REJILLA,
  type Diseno,
  type ItemDeDiseno,
  type SeccionDeDiseno,
} from '../diseno'
import { altoEfectivo, anchoEfectivoDelItem } from '../diseno-en-rejilla'
import type { Definicion } from '../formula'
import type { ItemDeHoja, SeccionDeHoja } from '../hoja'
import { rejillaDeLasPiezas, type RejillaDibujada } from '../posiciones-de-la-hoja'
import { ultimaFila } from '../rejilla-de-la-hoja'
import { itemDe } from './hoja-del-diseno'

export type PiezaDelLienzo = { item: ItemDeDiseno; dibujo: ItemDeHoja | null }
export type SeccionDelLienzo = Omit<SeccionDeHoja, 'items'> & {
  diseno: SeccionDeDiseno
  piezas: PiezaDelLienzo[]
  // Desde qué corte la rejilla de sus piezas dibuja posiciones y sus filas (nula sin piezas: el «+» solo, en el flujo).
  rejilla: RejillaDibujada | null
  // La fila del «+»: la siguiente a la última ocupada.
  filaDelHueco: number
}

function rejillaDeLaSeccion(items: readonly ItemDeDiseno[]) {
  const piezas = items.map((it) => ({
    posicion: it.posicion,
    ancho: anchoEfectivoDelItem(it),
    alto: altoEfectivo(it),
  }))
  const filaDelHueco = ultimaFila(piezas) + 1
  const hueco = {
    posicion: { columna: 1, fila: filaDelHueco },
    ancho: COLUMNAS_DE_LA_REJILLA,
    alto: 1,
  }
  return { rejilla: rejillaDeLasPiezas(piezas, [hueco]), filaDelHueco }
}

export function seccionesDelLienzo(diseno: Diseno, definicion: Definicion): SeccionDelLienzo[] {
  const nodos = new Map(definicion.nodos.map((n) => [n.id, n]))
  const tonosDeGrupo = new Map((definicion.grupos ?? []).map((g) => [g.id, g.tono]))
  return diseno.secciones.map((s) => ({
    id: s.id,
    titulo: s.titulo ?? null,
    presentacion: s.presentacion,
    ...aspectoDeSeccion(s),
    diseno: s,
    piezas: s.items.map((item) => ({
      item,
      dibujo: itemDe(item, nodos, tonosDeGrupo, diseno.tarjeta_total.nodo),
    })),
    ...rejillaDeLaSeccion(s.items),
  }))
}
