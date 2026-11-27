// Dónde va la tarjeta del total en el editor de la hoja (docs/GLOSARIO.md › «Tarjeta del total»): la pieza `{ tipo: 'total' }` de una sección principal y sin
// nivel, o, sin pieza (un diseño de antes), sola arriba de «Avanzado». Puras.
import { NIVEL_TODOS, type Diseno, type Posicion, type SeccionDeDiseno } from '../diseno'
import { sumarItem } from './insercion-del-diseno'

// La sección donde la base la acepta: principal y que la ven todos (`total_en_avanzado`, `total_con_nivel`).
export const admiteElTotal = (s: Pick<SeccionDeDiseno, 'presentacion' | 'nivel_ver'>): boolean =>
  s.presentacion === 'principal' && (s.nivel_ver ?? NIVEL_TODOS) === NIVEL_TODOS

export const MOTIVO_DEL_TOTAL_EN_AVANZADO = 'La tarjeta del total no va en una sección avanzada.'
export const MOTIVO_DEL_TOTAL_CON_NIVEL =
  'La tarjeta del total la ven todos: no va en una sección con nivel.'
export const MOTIVO_DEL_TOTAL_REPETIDO = 'La tarjeta del total ya está en la hoja.'

// Por qué la tarjeta del total no va en esa sección (nulo si va).
export function motivoParaElTotal(
  s: Pick<SeccionDeDiseno, 'presentacion' | 'nivel_ver'>,
): string | null {
  if (s.presentacion !== 'principal') return MOTIVO_DEL_TOTAL_EN_AVANZADO
  return admiteElTotal(s) ? null : MOTIVO_DEL_TOTAL_CON_NIVEL
}

// La primera pieza del total, con su sección, su lugar en la lista y su posición; nula sin pieza (se dibuja sola arriba de «Avanzado»).
export function dondeVaElTotal(
  d: Diseno,
): { seccion: string; indice: number; posicion: Posicion } | null {
  for (const s of d.secciones) {
    const indice = s.items.findIndex((it) => it.tipo === 'total')
    const item = s.items[indice]
    if (item !== undefined) return { seccion: s.id, indice, posicion: item.posicion }
  }
  return null
}

// «Ubicar en la hoja» de un diseño sin la pieza: en el primer lugar libre de la primera sección que la admite (a todo el ancho). Sin ninguna, o si ya está,
// el diseño tal cual.
export function ubicarElTotal(d: Diseno): Diseno {
  if (dondeVaElTotal(d) !== null) return d
  const s = d.secciones.find(admiteElTotal)
  return s === undefined ? d : sumarItem(d, s.id, { tipo: 'total' })
}
