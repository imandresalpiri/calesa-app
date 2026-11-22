// Las secciones del lienzo del editor de la hoja: cada sección del diseño con sus piezas como las dibuja la hoja (`itemDe()`, el espejo de `_cotizacion_hoja()`),
// alineadas una a una con los ítems del diseño (la posición k del lienzo es el ítem k de la sección: lo que se arrastra o se elige apunta a él). Una pieza cuyo
// nodo ya no está en la fórmula queda nula (el lienzo la dibuja marcada, con «Quitar la pieza»); una sección vacía se dibuja igual (con su «+»). Puras.
import { aspectoDeSeccion } from '../aspecto-de-la-hoja'
import type { Diseno, ItemDeDiseno, SeccionDeDiseno } from '../diseno'
import type { Definicion } from '../formula'
import type { ItemDeHoja, SeccionDeHoja } from '../hoja'
import { itemDe } from './hoja-del-diseno'

export type PiezaDelLienzo = { item: ItemDeDiseno; dibujo: ItemDeHoja | null }
export type SeccionDelLienzo = Omit<SeccionDeHoja, 'items'> & {
  diseno: SeccionDeDiseno
  piezas: PiezaDelLienzo[]
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
  }))
}
