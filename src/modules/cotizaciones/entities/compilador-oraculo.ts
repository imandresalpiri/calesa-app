// El oráculo de las pruebas de propiedades del compilador (`compilador-generador.ts`): calcula directo en JS el árbol que el
// generador escribió como texto, con la semántica del motor. Un resultado que no es finito vale null y se propaga (JSON no guarda
// ∞ ni NaN), −0 vale 0 y dividir por 0 es null; una comparación vale 1 o 0 y la igualdad es exacta. Sólo para las pruebas.
import { esDeCondicion, esDeFuncion, MIEMBROS, PARAMS, type Expr } from './compilador-generador'
import type { Comparador } from './nodos'
import { redondear } from '@/shared/lib/redondeo'

const normal = (x: number): number | null => (Number.isFinite(x) ? (x === 0 ? 0 : x) : null)

type Datos = { inputs: Record<string, number>; banderas: Record<string, boolean> }

function oraculoBinario(e: Extract<Expr, { t: 'bin' }>, d: Datos): number | null {
  const [a, b] = [oraculo(e.a, d.inputs, d.banderas), oraculo(e.b, d.inputs, d.banderas)]
  if (a === null || b === null) return null
  if (e.op === '/') return b === 0 ? null : normal(a / b)
  return normal(e.op === '+' ? a + b : e.op === '-' ? a - b : a * b)
}

const comparar = (a: number, op: Comparador, b: number): boolean =>
  op === '>'
    ? a > b
    : op === '<'
      ? a < b
      : op === '>='
        ? a >= b
        : op === '<='
          ? a <= b
          : op === '='
            ? a === b
            : a !== b

// Null si alguno lo es; si no, los valores.
function todos(xs: readonly Expr[], d: Datos): number[] | null {
  const vs = xs.map((x) => oraculo(x, d.inputs, d.banderas))
  return vs.some((x) => x === null) ? null : (vs as number[])
}

// De izquierda a derecha, el que supera estrictamente al actual.
function extremo(vs: number[] | null, op: 'MAX' | 'MIN'): number | null {
  if (vs === null) return null
  let actual: number | null = null
  for (const x of vs) if (actual === null || (op === 'MAX' ? x > actual : x < actual)) actual = x
  return actual
}

function oraculoDeCondicion(
  e: Extract<Expr, { t: 'cmp' | 'flag' | 'elegir' }>,
  d: Datos,
): number | null {
  const v = (x: Expr) => oraculo(x, d.inputs, d.banderas)
  switch (e.t) {
    case 'cmp': {
      const [a, b] = [v(e.a), v(e.b)]
      return a === null || b === null ? null : comparar(a, e.op, b) ? 1 : 0
    }
    case 'flag':
      return d.banderas[e.id] === true ? 1 : 0
    case 'elegir': {
      const [c, x, y] = [v(e.c), v(e.x), e.y === undefined ? 0 : v(e.y)]
      return c === null ? null : c !== 0 ? x : y
    }
  }
}

function oraculoDeExtremo(e: Extract<Expr, { t: 'yo' | 'ext' | 'extg' }>, d: Datos): number | null {
  switch (e.t) {
    case 'yo': {
      const vs = todos(e.cs, d)
      if (vs === null) return null
      return (e.op === 'Y' ? vs.every((x) => x !== 0) : vs.some((x) => x !== 0)) ? 1 : 0
    }
    case 'ext':
      return extremo(todos(e.xs, d), e.op)
    case 'extg':
      return extremo(
        MIEMBROS.map((id) => d.inputs[id] ?? PARAMS[id] ?? 0),
        e.op,
      )
  }
}

function oraculoDeFuncion(
  e: Extract<Expr, { t: 'suma' | 'si' | 'red' | 'pct' }>,
  d: Datos,
): number | null {
  const v = (x: Expr) => oraculo(x, d.inputs, d.banderas)
  switch (e.t) {
    case 'suma':
      return MIEMBROS.reduce<number | null>(
        (s, id) => (s === null ? null : normal(s + (d.inputs[id] ?? PARAMS[id] ?? 0))),
        0,
      )
    case 'si':
      return d.banderas[e.flag] === true ? v(e.x) : 0
    case 'red': {
      const x = v(e.x)
      return x === null ? null : normal(redondear(x, e.n))
    }
    case 'pct': {
      const [x, p] = [v(e.x), v(e.p)]
      return x === null || p === null ? null : normal(x * p)
    }
  }
}

// El cálculo directo en JS, con la semántica del motor.
export function oraculo(
  e: Expr,
  inputs: Record<string, number>,
  banderas: Record<string, boolean>,
): number | null {
  if (e.t === 'ref') return inputs[e.id] ?? PARAMS[e.id] ?? 0
  if (e.t === 'lit') return e.valor
  const d = { inputs, banderas }
  if (e.t === 'bin') return oraculoBinario(e, d)
  if (esDeFuncion(e)) return oraculoDeFuncion(e, d)
  if (esDeCondicion(e)) return oraculoDeCondicion(e, d)
  return oraculoDeExtremo(e, d)
}
