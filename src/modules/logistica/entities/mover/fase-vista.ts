// Qué muestra «Qué falta» según la fase que se toca en la cadena de la unidad (`?fase_vista=`). La actual: lo de hoy. Una que falta y es destino directo (una salida
// de la actual): sus requisitos y «Mover». Una que falta y no es directa: sus requisitos, sin «Mover», y por cuál tiene que pasar primero. Una pasada: cuándo entró
// y salió, quién la movió y su nota, sin lectura. Sin I/O.
import type { NodoDeLaCadena } from './cadena'

/** La clave de la URL con la fase que se mira en la cadena (`?fase_vista=<clave del nodo>`). */
export const CLAVE_DE_FASE_VISTA = 'fase_vista'

export type FaseVista =
  | { tipo: 'actual' }
  | { tipo: 'directa'; nodo: NodoDeLaCadena }
  | { tipo: 'indirecta'; nodo: NodoDeLaCadena; primero: string | null }
  | { tipo: 'pasada'; nodo: NodoDeLaCadena }

/** El nodo que se mira: el de la clave si es de la cadena y no es la actual; nulo si no (se muestra la actual y la URL se limpia). */
export function nodoVisto(
  clave: string | null,
  nodos: readonly NodoDeLaCadena[],
): NodoDeLaCadena | null {
  if (clave === null) return null
  const nodo = nodos.find((n) => n.clave === clave)
  return nodo === undefined || nodo.tipo === 'actual' ? null : nodo
}

/**
 * Qué mostrar de la fase vista. `destinos` son las fases a las que hoy se puede mover (las salidas que leyó «Qué falta»). La que no es directa nombra la primera del
 * camino (por donde sigue la unidad), salvo que sea ella misma.
 */
export function queMostrarDeLaFase(
  clave: string | null,
  nodos: readonly NodoDeLaCadena[],
  destinos: readonly string[],
): FaseVista {
  const nodo = nodoVisto(clave, nodos)
  if (nodo === null) return { tipo: 'actual' }
  if (nodo.tipo === 'pasada') return { tipo: 'pasada', nodo }
  if (nodo.faseId !== null && destinos.includes(nodo.faseId)) return { tipo: 'directa', nodo }
  const siguiente = nodos.find((n) => n.tipo === 'falta')
  return {
    tipo: 'indirecta',
    nodo,
    primero: siguiente !== undefined && siguiente.clave !== nodo.clave ? siguiente.nombre : null,
  }
}

/** «Primero tiene que pasar por «X».» */
export function textoDePrimero(primero: string): string {
  return `Primero tiene que pasar por «${primero}».`
}

/** La que no es destino y tampoco tiene otra antes en el camino (no hay salida de la actual hacia ella). */
export const NO_SE_LLEGA_DESDE_LA_ACTUAL = 'No se puede mover ahí desde la fase actual.'

/** El encabezado de «Qué falta» mientras se mira otra fase de la cadena. */
export function textoDeLaFaseVista(nombre: string): string {
  return `Viendo «${nombre}»`
}

/** Cuando falla la lectura de los requisitos de una fase que no es destino. */
export function noSeLeyeronLosRequisitos(nombre: string): string {
  return `No pudimos leer los requisitos de «${nombre}».`
}
