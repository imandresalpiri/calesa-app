// Elegir los «Decimales» de una fila de la planilla (glosario: «Decimales (de una celda)»): de 0 a 4, o «Automático» (`null`: el nodo queda sin la clave).
// Sólo en un nodo que se muestra como número (`aceptaDecimales`), y se aplica sólo si `validarFormula()` sigue valiendo: un rechazo que ya estaba antes no
// lo frena (lo dice su fila), como al cambiar el tipo de celda. No toca el cálculo. Puro.
import { aceptaDecimales } from '../decimales-de-celda'
import type { Formula } from '../formula'
import type { Nodo } from '../nodos'
import { validarFormula } from '../validar'
import { filaDe, hojaDeLaPlanilla, type HojaDeLaPlanilla } from './hoja-de-la-planilla'
import { mensajeEnA1 } from './mensaje-en-a1'
import { paramsParaValidar } from './params-para-validar'

export type ResultadoDeCambiarDecimales =
  | { readonly ok: true; readonly formula: Formula }
  | { readonly ok: false; readonly mensaje: string }

export const MENSAJE_FILA_INEXISTENTE = 'Esa fila no existe.'
export const MENSAJE_SIN_DECIMALES = 'Esta celda muestra un texto: no lleva decimales.'
// La fila de un dato del vehículo que no es un número (`datosQueNoSonNumero()`): la regla pura no conoce los campos del origen, lo dice la planilla.
export const MENSAJE_DATO_SIN_NUMERO = 'Este dato del vehículo no es un número: no lleva decimales.'

// Por qué esa fila no lleva decimales, o nulo.
export function motivoSinDecimales(
  formula: Pick<Formula, 'definicion'>,
  numero: number,
  hoja: HojaDeLaPlanilla = hojaDeLaPlanilla(formula),
): string | null {
  const fila = filaDe(hoja, numero)
  if (fila === undefined) return MENSAJE_FILA_INEXISTENTE
  return aceptaDecimales(fila.nodo) ? null : MENSAJE_SIN_DECIMALES
}

// El nodo con esos decimales, o sin la clave con `null`.
function conDecimales(nodo: Nodo, decimales: number | null): Nodo {
  const { decimales: _antes, ...sin } = nodo
  return (decimales === null ? sin : { ...sin, decimales }) as Nodo
}

export function cambiarDecimales(
  formula: Formula,
  numero: number,
  decimales: number | null,
  hoja: HojaDeLaPlanilla = hojaDeLaPlanilla(formula),
): ResultadoDeCambiarDecimales {
  const motivo = motivoSinDecimales(formula, numero, hoja)
  const fila = filaDe(hoja, numero)
  if (motivo !== null || fila === undefined)
    return { ok: false, mensaje: motivo ?? MENSAJE_FILA_INEXISTENTE }
  const nodos = formula.definicion.nodos.map((n) =>
    n.id === fila.id ? conDecimales(n, decimales) : n,
  )
  const nueva: Formula = { ...formula, definicion: { ...formula.definicion, nodos } }
  const v = validarFormula(nueva.definicion, paramsParaValidar(nueva))
  if (v.ok) return { ok: true, formula: nueva }
  const antes = validarFormula(formula.definicion, paramsParaValidar(formula))
  if (!antes.ok && antes.error.mensaje === v.error.mensaje) return { ok: true, formula: nueva }
  return { ok: false, mensaje: mensajeEnA1(v.error.mensaje, hojaDeLaPlanilla(nueva)) }
}
