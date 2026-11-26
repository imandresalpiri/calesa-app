// Las operaciones rápidas de la barra de fórmula (D13–D15 de la fórmula fácil): «Sumar» (`=␣+␣`), «Porcentaje de» (`=PORCENTAJE_DE(␣; ␣%)`) y «Si… entonces…»
// (`=SI(␣; ␣; ␣)`), donde cada ␣ es un lugar por llenar sin texto. Con el texto vacío o sin «=», lo escrito va a su lugar (con «%» si es un % en puntos); con
// una fórmula, la forma sin «=» va en el cursor, nunca antes del «=». El cursor queda en el primer lugar que espera un operando y los demás se guardan como
// distancia al final del texto: lo que queda después de un lugar no cambia mientras se llena de izquierda a derecha. Puro.
import { esperaOperando } from './referencias-tipeadas'

export type ClaveDeOperacion = 'sumar' | 'porcentaje' | 'si'

export type OperacionRapida = {
  readonly clave: ClaveDeOperacion
  readonly etiqueta: string
  // El texto entre lugares: n piezas dejan n − 1 lugares.
  readonly piezas: readonly string[]
  // A qué lugar va lo escrito sin «=».
  readonly lugarDeLoEscrito: number
}

export const OPERACIONES_RAPIDAS: readonly OperacionRapida[] = [
  { clave: 'sumar', etiqueta: 'Sumar', piezas: ['', '+', ''], lugarDeLoEscrito: 0 },
  {
    clave: 'porcentaje',
    etiqueta: 'Porcentaje de',
    piezas: ['PORCENTAJE_DE(', '; ', '%)'],
    lugarDeLoEscrito: 0,
  },
  { clave: 'si', etiqueta: 'Si… entonces…', piezas: ['SI(', '; ', '; ', ')'], lugarDeLoEscrito: 1 },
]

// Lo tipeado con el cursor y los lugares por llenar que quedan después del cursor (distancias al final, de izquierda a derecha).
export type TextoConLugares = {
  readonly texto: string
  readonly cursor: number
  readonly lugares: readonly number[]
}

const operacion = (clave: ClaveDeOperacion): OperacionRapida => {
  const o = OPERACIONES_RAPIDAS.find((x) => x.clave === clave)
  if (o === undefined) throw new Error(`operación desconocida: ${clave}`)
  return o
}

// Arma `antes + piezas con lo de cada lugar + despues` y dice dónde cae cada lugar vacío.
function armar(antes: string, piezas: readonly string[], llenos: ReadonlyMap<number, string>) {
  let texto = antes
  const vacios: number[] = []
  for (const [i, pieza] of piezas.entries()) {
    texto += pieza
    if (i === piezas.length - 1) break
    const lleno = llenos.get(i)
    if (lleno === undefined) vacios.push(texto.length)
    else texto += lleno
  }
  return { texto, vacios }
}

export function insertarOperacion(
  texto: string,
  cursor: number,
  clave: ClaveDeOperacion,
  enPuntos = false,
): TextoConLugares {
  const o = operacion(clave)
  const conIgual = texto.trimStart().startsWith('=')
  const escrito = conIgual ? '' : texto.trim()
  const llenos = new Map<number, string>()
  if (escrito !== '') llenos.set(o.lugarDeLoEscrito, enPuntos ? `${escrito}%` : escrito)
  const en = conIgual ? Math.max(texto.indexOf('=') + 1, Math.min(cursor, texto.length)) : 0
  const antes = conIgual ? texto.slice(0, en) : '='
  const despues = conIgual ? texto.slice(en) : ''
  const armado = armar(antes, o.piezas, llenos)
  const nuevo = armado.texto + despues
  // Un lugar pegado a un operando que ya estaba (Sumar tras `=C5`) ya está lleno.
  const vacios = armado.vacios.filter((p) => esperaOperando(nuevo, p))
  const [primero, ...resto] = vacios
  return {
    texto: nuevo,
    cursor: primero ?? armado.texto.length,
    lugares: resto.map((p) => nuevo.length - p),
  }
}

const posicion = (texto: string, distancia: number) => texto.length - distancia

// Sólo los lugares que siguen después del cursor y caben en el texto (tras tipear, borrar o pasar por encima de uno).
export function podarLugares(
  texto: string,
  cursor: number,
  lugares: readonly number[],
): readonly number[] {
  const quedan = lugares.filter((d) => d >= 0 && posicion(texto, d) > cursor)
  return quedan.length === lugares.length ? lugares : quedan
}

// El cursor en el siguiente lugar por llenar (Tab o «Siguiente»), o nulo si no queda ninguno.
export function siguienteLugar(
  texto: string,
  cursor: number,
  lugares: readonly number[],
): { cursor: number; lugares: readonly number[] } | null {
  const quedan = podarLugares(texto, cursor, lugares)
  const [primero, ...resto] = quedan
  if (primero === undefined) return null
  return { cursor: posicion(texto, primero), lugares: resto }
}

const OPERADORES = new Set(['+', '-', '*', '/'])

// Tras tocar una celda: si entre el cursor y el siguiente lugar no hay más que un `+ - * /`, el cursor salta a ese lugar (Sumar: `=C5|+` → `=C5+|`), así el
// segundo toque no reemplaza la referencia. Nulo: no salta.
export function saltoTrasReferencia(
  texto: string,
  cursor: number,
  lugares: readonly number[],
): { cursor: number; lugares: readonly number[] } | null {
  const [primero, ...resto] = podarLugares(texto, cursor, lugares)
  if (primero === undefined) return null
  const p = posicion(texto, primero)
  return OPERADORES.has(texto.slice(cursor, p).trim()) ? { cursor: p, lugares: resto } : null
}
