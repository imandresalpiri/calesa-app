// El modelo del campo «Texto» del editor de la tarjeta, que mezcla texto y datos (glosario: «Texto con datos»; cada dato es una pastilla). Las posiciones van en
// unidades: cada unidad de UTF-16 de un texto vale 1 (como los desplazamientos de la selección del navegador) y cada dato vale 1. Todo lo que sale va normalizado
// (los textos seguidos, juntos; sin textos vacíos), y `contenidoDeLasPartes()` escribe la única forma: sin datos, `{tipo: 'texto', texto}`. Puro.
import {
  MAXIMO_DE_PARTES_DE_UN_TEXTO,
  type ContenidoDeLaCelda,
  type DatoDeLaCelda,
  type ParteDelTexto,
  type TextoConDatos,
  type TextoSimple,
} from '../../cuadricula-de-la-tarjeta'

export type PartesConCursor = { readonly partes: ParteDelTexto[]; readonly pos: number }

const largoDe = (p: ParteDelTexto) => (typeof p === 'string' ? p.length : 1)

export const partesDe = (c: TextoSimple | TextoConDatos): ParteDelTexto[] =>
  'partes' in c ? [...c.partes] : c.texto === '' ? [] : [c.texto]

export function normalizarPartes(partes: readonly ParteDelTexto[]): ParteDelTexto[] {
  const salida: ParteDelTexto[] = []
  for (const p of partes) {
    if (p === '') continue
    const ultima = salida.at(-1)
    if (typeof p === 'string' && typeof ultima === 'string') salida[salida.length - 1] = ultima + p
    else salida.push(p)
  }
  return salida
}

export function contenidoDeLasPartes(
  partes: readonly ParteDelTexto[],
): TextoSimple | TextoConDatos {
  const normales = normalizarPartes(partes)
  if (normales.some((p) => typeof p !== 'string')) return { tipo: 'texto', partes: normales }
  return { tipo: 'texto', texto: normales.join('') }
}

export const largoEnUnidades = (partes: readonly ParteDelTexto[]): number =>
  partes.reduce((suma, p) => suma + largoDe(p), 0)

// Lo de antes y lo de después de una posición (un texto se parte en dos).
function cortar(partes: readonly ParteDelTexto[], pos: number): [ParteDelTexto[], ParteDelTexto[]] {
  const antes: ParteDelTexto[] = []
  const despues: ParteDelTexto[] = []
  let resto = pos
  for (const p of partes) {
    const largo = largoDe(p)
    if (resto >= largo) {
      antes.push(p)
      resto -= largo
    } else if (resto <= 0 || typeof p !== 'string') {
      despues.push(p)
    } else {
      antes.push(p.slice(0, resto))
      despues.push(p.slice(resto))
      resto = 0
    }
  }
  return [antes, despues]
}

// Escribir o pegar un texto (un salto de línea con Enter) en lugar de lo que va de `desde` a `hasta`.
export function reemplazarConTexto(
  partes: readonly ParteDelTexto[],
  desde: number,
  hasta: number,
  texto: string,
): PartesConCursor {
  const [antes] = cortar(partes, Math.min(desde, hasta))
  const [, despues] = cortar(partes, Math.max(desde, hasta))
  return {
    partes: normalizarPartes([...antes, texto, ...despues]),
    pos: Math.min(desde, hasta) + texto.length,
  }
}

export const insertarTexto = (partes: readonly ParteDelTexto[], pos: number, texto: string) =>
  reemplazarConTexto(partes, pos, pos, texto)

// Insertar un dato en el cursor (en lugar de lo elegido, si va de `pos` a `hasta`): el cursor queda después de su pastilla.
export function insertarDato(
  partes: readonly ParteDelTexto[],
  pos: number,
  dato: DatoDeLaCelda,
  hasta: number = pos,
): PartesConCursor {
  const [antes] = cortar(partes, Math.min(pos, hasta))
  const [, despues] = cortar(partes, Math.max(pos, hasta))
  return {
    partes: normalizarPartes([...antes, dato, ...despues]),
    pos: Math.min(pos, hasta) + 1,
  }
}

// Cambiar el dato de la parte `i` (tocar su pastilla y elegir otro).
export const cambiarDato = (
  partes: readonly ParteDelTexto[],
  i: number,
  dato: DatoDeLaCelda,
): ParteDelTexto[] => partes.map((p, j) => (j === i && typeof p !== 'string' ? dato : p))

// El índice del dato que está justo antes o justo después del cursor; nulo si ahí hay texto o nada.
export function datoJuntoAlCursor(
  partes: readonly ParteDelTexto[],
  pos: number,
  lado: 'antes' | 'despues',
): number | null {
  const unidad = lado === 'antes' ? pos - 1 : pos
  if (unidad < 0) return null
  let inicio = 0
  for (const [i, p] of partes.entries()) {
    const largo = largoDe(p)
    if (unidad < inicio + largo) return typeof p === 'string' ? null : i
    inicio += largo
  }
  return null
}

// Quitar la parte `i` entera (Retroceso o Supr junto a una pastilla): el cursor queda donde estaba.
export function quitarParte(partes: readonly ParteDelTexto[], i: number): PartesConCursor {
  const pos = largoEnUnidades(partes.slice(0, i))
  return { partes: normalizarPartes(partes.filter((_, j) => j !== i)), pos }
}

// Si una celda se escribe en el lugar (Enter, F2 o doble clic): sin celda, vacía o con un texto fijo. Un texto con datos se edita en el panel: en el lugar
// perdería sus datos.
export const seEscribeEnElLugar = (c: ContenidoDeLaCelda | null | undefined): boolean =>
  c == null || c.tipo === 'vacio' || (c.tipo === 'texto' && !('partes' in c))

export const MOTIVO_DE_LAS_PARTES = 'Un texto lleva hasta 20 partes entre texto y datos.'

// Por qué no se puede insertar otro dato en el cursor: pasaría de 20 partes (insertarlo en medio de un texto lo parte en dos).
export function motivoParaInsertar(
  partes: readonly ParteDelTexto[],
  pos: number,
  hasta: number = pos,
): string | null {
  const dato: DatoDeLaCelda = { tipo: 'dato', variable: 'numero' }
  const { partes: con } = insertarDato(partes, pos, dato, hasta)
  return con.length > MAXIMO_DE_PARTES_DE_UN_TEXTO ? MOTIVO_DE_LAS_PARTES : null
}
