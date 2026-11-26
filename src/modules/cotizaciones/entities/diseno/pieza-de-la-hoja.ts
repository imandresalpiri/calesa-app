// La pieza elegida en el editor de la hoja (docs/GLOSARIO.md › «Inspector de la hoja»), como va en `?pieza=`: recargar la conserva y «Ir a la pieza» de un
// rechazo lleva ahí.
// - Una celda, una variante, un interruptor o una franja de subtotal: el id de su nodo (`remate`). Su nodo no se repite en un diseño válido.
// - Unos atajos: `atajos-<nodo>` (comparten el nodo con su celda).
// - Una sección: `seccion-<id>`.
// - La tarjeta del total: `tarjeta-del-total`; la cabecera: `cabecera-de-la-hoja`; el bloque «Avanzado» (su lugar en la rejilla): `bloque-avanzado`.
// Un id (`esquemaId`) no lleva guiones: ninguna de las formas choca con otra.
import {
  piezaDelItem,
  type ClaveDePieza,
  type Diseno,
  type ItemDeDiseno,
  type PiezaEnLaSeccion,
  type SeccionDeDiseno,
} from '../diseno'
import { esquemaId } from '../nodos'

export const CLAVE_DE_LA_PIEZA = 'pieza'

export type PiezaDeLaHoja =
  | { pieza: 'nodo'; nodo: string }
  | { pieza: 'atajos'; nodo: string }
  | { pieza: 'seccion'; seccion: string }
  | { pieza: 'total' }
  | { pieza: 'cabecera' }
  | { pieza: 'bloque-avanzado' }

const DE_LOS_ATAJOS = 'atajos-'
const DE_LA_SECCION = 'seccion-'
const DEL_TOTAL = 'tarjeta-del-total'
const DE_LA_CABECERA = 'cabecera-de-la-hoja'
const DEL_BLOQUE = 'bloque-avanzado'

export function textoDeLaPieza(p: PiezaDeLaHoja): string {
  switch (p.pieza) {
    case 'nodo':
      return p.nodo
    case 'atajos':
      return `${DE_LOS_ATAJOS}${p.nodo}`
    case 'seccion':
      return `${DE_LA_SECCION}${p.seccion}`
    case 'total':
      return DEL_TOTAL
    case 'cabecera':
      return DE_LA_CABECERA
    case 'bloque-avanzado':
      return DEL_BLOQUE
    default: {
      const _: never = p
      return _
    }
  }
}

const esId = (texto: string) => esquemaId.safeParse(texto).success

// Lo que no es una de las formas (otro texto, un id mal escrito) no elige nada.
export function piezaDelTexto(texto: string | null | undefined): PiezaDeLaHoja | null {
  if (texto === null || texto === undefined) return null
  if (texto === DEL_TOTAL) return { pieza: 'total' }
  if (texto === DE_LA_CABECERA) return { pieza: 'cabecera' }
  if (texto === DEL_BLOQUE) return { pieza: 'bloque-avanzado' }
  if (texto.startsWith(DE_LOS_ATAJOS)) {
    const nodo = texto.slice(DE_LOS_ATAJOS.length)
    return esId(nodo) ? { pieza: 'atajos', nodo } : null
  }
  if (texto.startsWith(DE_LA_SECCION)) {
    const seccion = texto.slice(DE_LA_SECCION.length)
    return esId(seccion) ? { pieza: 'seccion', seccion } : null
  }
  return esId(texto) ? { pieza: 'nodo', nodo: texto } : null
}

export const mismaPieza = (a: PiezaDeLaHoja | null, b: PiezaDeLaHoja | null): boolean =>
  a !== null && b !== null && textoDeLaPieza(a) === textoDeLaPieza(b)

// La pieza de un ítem del diseño o de su clave (sin la sección: su nodo, o los atajos de su nodo, o la tarjeta del total).
export function piezaDelItemDeLaHoja(item: ItemDeDiseno | PiezaEnLaSeccion): PiezaDeLaHoja {
  if (item.tipo === 'total') return { pieza: 'total' }
  return item.tipo === 'atajos'
    ? { pieza: 'atajos', nodo: item.nodo }
    : { pieza: 'nodo', nodo: item.nodo }
}

export type UbicacionDeLaPieza = { seccion: SeccionDeDiseno; indice: number; item: ItemDeDiseno }

// Dónde está un ítem elegido: la primera aparición en el orden del diseño (en uno que no valida, un nodo repetido; gana el primero, como en las ediciones).
// Nulo para una sección, la cabecera o lo que ya no está.
export function ubicarLaPieza(d: Diseno, p: PiezaDeLaHoja): UbicacionDeLaPieza | null {
  if (p.pieza === 'seccion' || p.pieza === 'cabecera' || p.pieza === 'bloque-avanzado') return null
  const coincide = (it: ItemDeDiseno) => mismaPieza(piezaDelItemDeLaHoja(it), p)
  for (const seccion of d.secciones) {
    const indice = seccion.items.findIndex(coincide)
    const item = seccion.items[indice]
    if (item !== undefined) return { seccion, indice, item }
  }
  return null
}

export const claveDeLaUbicacion = (u: UbicacionDeLaPieza): ClaveDePieza => ({
  ...piezaDelItem(u.item),
  seccion: u.seccion.id,
})
