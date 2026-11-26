import type { FormatoDeXCell } from '@/shared/ui/xcell'
import type { Entradas, IndiceDeHoja } from './entradas'
import { formatoDeCelda } from './formato-de-celda'
import type { CeldaDeHoja, TipoDeNodoDeHoja } from './hoja'
import type { Formato } from './nodos'
import type { RespuestaDeRecalculo } from './recalculo'

// Lo escrito sobre un cálculo de la hoja (`docs/COTIZADOR.md` › «Pisar un cálculo»): qué lado de una celda quedó pisado, lo que daría sin lo escrito y si una
// confirmación pisa uno nuevo (el aviso de la primera vez). Qué se deja pisar lo dicen la base y el nivel (la celda llega editable o con candado); acá sólo se lee.

// Un cálculo de la fórmula: lo que la base deja pisar al cotizar si tiene celda (el total llega con candado, `se_calcula`).
export const esCalculo = (tipo: TipoDeNodoDeHoja): boolean =>
  tipo === 'tabla' || tipo === 'tramo' || tipo === 'calculo'

export type LadoPisado = { nodo: string; formato: Formato; decimales: number | undefined }

// El lado de la celda donde lo escrito pisa un cálculo: el principal primero (con el monto escrito, el porcentaje de un par lo escribe el par) y si no, el
// secundario; nulo si ninguno. Un override sobre una constante o un tipo de cambio no es un cálculo pisado: vuelve «al valor por defecto».
export function ladoPisado(
  celda: CeldaDeHoja,
  overrides: ReadonlyMap<string, number>,
): LadoPisado | null {
  if (esCalculo(celda.tipoDeNodo) && overrides.has(celda.nodo)) {
    return { nodo: celda.nodo, formato: celda.formato, decimales: celda.decimales }
  }
  const s = celda.secundario
  return s !== null && esCalculo(s.tipoDeNodo) && overrides.has(s.nodo)
    ? { nodo: s.nodo, formato: s.formato, decimales: s.decimales }
    : null
}

// Lo que daría el nodo sin lo escrito, de la respuesta que ya calculó el pisado. Antes de esa respuesta (la pausa de tecleo, sin red) no hay cifra: nunca una vieja.
export const calculadoDe = (
  nodo: string,
  respuesta: RespuestaDeRecalculo | null,
): number | null | undefined =>
  respuesta?.calculados.has(nodo) === true ? (respuesta.calculados.get(nodo) ?? null) : undefined

// Lo que la `XCell` dibuja de lo pisado (props primitivas, por el `memo`): la marca «Editado a mano» y «Calculado: …» en el formato y los decimales del lado
// pisado.
export type PropsDelPisado = {
  handEdited: boolean
  calculatedValue: number | null | undefined
  calculatedFormat: FormatoDeXCell | undefined
  calculatedDecimals: number | undefined
}

const SIN_PISAR: PropsDelPisado = {
  handEdited: false,
  calculatedValue: undefined,
  calculatedFormat: undefined,
  calculatedDecimals: undefined,
}

export function propsDelPisado(
  celda: CeldaDeHoja,
  entradas: Entradas,
  respuesta: RespuestaDeRecalculo | null,
): PropsDelPisado {
  const lado = ladoPisado(celda, entradas.overrides)
  if (lado === null) {
    return SIN_PISAR
  }
  return {
    handEdited: true,
    calculatedValue: calculadoDe(lado.nodo, respuesta),
    calculatedFormat: formatoDeCelda(lado.formato),
    calculatedDecimals: lado.decimales,
  }
}

// Si el id (cualquiera de los dos lados de una celda) es un cálculo: lo escrito sobre él lo pisa.
function esLadoDeCalculo(indice: IndiceDeHoja, id: string): boolean {
  const lado = indice.lados.get(id)
  const tipo =
    lado?.lado === 'secundario' ? lado.celda.secundario?.tipoDeNodo : lado?.celda.tipoDeNodo
  return tipo !== undefined && esCalculo(tipo)
}

// Si confirmar `valor` sobre `id` pisa un cálculo que no estaba pisado: enciende el aviso de la primera vez. Vaciar la celda no pisa (vuelve al calculado), y
// volver a escribir sobre uno ya pisado no es nuevo.
export function esPisadoNuevo(
  indice: IndiceDeHoja,
  entradas: Entradas,
  id: string,
  valor: number | null,
): boolean {
  return valor !== null && !entradas.overrides.has(id) && esLadoDeCalculo(indice, id)
}

// Si algo de lo escrito pisa un cálculo de la hoja: sólo entonces se pide el código de la lista del resumen.
export const hayPisadas = (indice: IndiceDeHoja, entradas: Entradas): boolean =>
  [...entradas.overrides.keys()].some((id) => esLadoDeCalculo(indice, id))
