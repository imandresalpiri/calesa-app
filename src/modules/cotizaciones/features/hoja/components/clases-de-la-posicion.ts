// La posición de cada pieza en su rejilla (docs/GLOSARIO.md › «Posición (en la rejilla)»; la regla, en `entities/posiciones-de-la-hoja.ts`): desde el
// corte de la rejilla, `col-start`, `row-start` y `row-span` leen variables del estilo en línea de cada pieza, y la rejilla declara sus filas con otra. Una
// tabla por corte, escrita entera (Tailwind no ve una clase armada con un trozo); el `col-span-N` de la pieza sigue siendo el de siempre: Tailwind pone la
// forma abreviada (`grid-column`, `grid-row`) antes que la larga (`grid-column-start`, `grid-row-start`). Debajo del corte no hay nada de esto: las piezas
// van en orden de lectura con las clases de siempre.
import type { CSSProperties } from 'react'
import type { Corte } from '../../../entities/rejilla-de-la-hoja'

// Los cortes a los que llega una rejilla (el más exigente de los de `corteDe()` y el de una sección «Automática»).
export type CorteConPosicion = 'siempre' | 'lg' | '2xl' | '3xl' | '5xl' | '7xl'
const CORTE_QUE_LLEGA: Readonly<Record<Corte | 'siempre', CorteConPosicion>> = {
  siempre: 'siempre',
  lg: 'lg',
  xl: '2xl',
  '2xl': '2xl',
  '3xl': '3xl',
  '4xl': '5xl',
  '5xl': '5xl',
  '6xl': '7xl',
  '7xl': '7xl',
}
// Un corte que `corteDe()` no da va al siguiente que sí (más exigente: nada se encima).
export const corteConPosicion = (c: Corte | 'siempre'): CorteConPosicion => CORTE_QUE_LLEGA[c]

export const POSICION_DEL_ITEM: Readonly<Record<CorteConPosicion, string>> = {
  siempre: 'col-start-(--pieza-columna) row-start-(--pieza-fila) row-span-(--pieza-alto)',
  lg: '@lg:col-start-(--pieza-columna) @lg:row-start-(--pieza-fila) @lg:row-span-(--pieza-alto)',
  '2xl':
    '@2xl:col-start-(--pieza-columna) @2xl:row-start-(--pieza-fila) @2xl:row-span-(--pieza-alto)',
  '3xl':
    '@3xl:col-start-(--pieza-columna) @3xl:row-start-(--pieza-fila) @3xl:row-span-(--pieza-alto)',
  '5xl':
    '@5xl:col-start-(--pieza-columna) @5xl:row-start-(--pieza-fila) @5xl:row-span-(--pieza-alto)',
  '7xl':
    '@7xl:col-start-(--pieza-columna) @7xl:row-start-(--pieza-fila) @7xl:row-span-(--pieza-alto)',
}
export const POSICION_DE_LA_SECCION: Readonly<Record<CorteConPosicion, string>> = {
  siempre: 'col-start-(--seccion-columna) row-start-(--seccion-fila) row-span-(--seccion-alto)',
  lg: '@lg/secciones:col-start-(--seccion-columna) @lg/secciones:row-start-(--seccion-fila) @lg/secciones:row-span-(--seccion-alto)',
  '2xl':
    '@2xl/secciones:col-start-(--seccion-columna) @2xl/secciones:row-start-(--seccion-fila) @2xl/secciones:row-span-(--seccion-alto)',
  '3xl':
    '@3xl/secciones:col-start-(--seccion-columna) @3xl/secciones:row-start-(--seccion-fila) @3xl/secciones:row-span-(--seccion-alto)',
  '5xl':
    '@5xl/secciones:col-start-(--seccion-columna) @5xl/secciones:row-start-(--seccion-fila) @5xl/secciones:row-span-(--seccion-alto)',
  '7xl':
    '@7xl/secciones:col-start-(--seccion-columna) @7xl/secciones:row-start-(--seccion-fila) @7xl/secciones:row-span-(--seccion-alto)',
}
export const FILAS_DE_LA_REJILLA_DE_CELDAS: Readonly<Record<CorteConPosicion, string>> = {
  siempre: 'grid-rows-(--filas-de-la-seccion)',
  lg: '@lg:grid-rows-(--filas-de-la-seccion)',
  '2xl': '@2xl:grid-rows-(--filas-de-la-seccion)',
  '3xl': '@3xl:grid-rows-(--filas-de-la-seccion)',
  '5xl': '@5xl:grid-rows-(--filas-de-la-seccion)',
  '7xl': '@7xl:grid-rows-(--filas-de-la-seccion)',
}
export const FILAS_DE_LA_REJILLA_DE_SECCIONES: Readonly<Record<CorteConPosicion, string>> = {
  siempre: 'grid-rows-(--filas-de-las-secciones)',
  lg: '@lg/secciones:grid-rows-(--filas-de-las-secciones)',
  '2xl': '@2xl/secciones:grid-rows-(--filas-de-las-secciones)',
  '3xl': '@3xl/secciones:grid-rows-(--filas-de-las-secciones)',
  '5xl': '@5xl/secciones:grid-rows-(--filas-de-las-secciones)',
  '7xl': '@7xl/secciones:grid-rows-(--filas-de-las-secciones)',
}

type ConPosicion = { posicion?: { columna: number; fila: number }; alto?: number }

// Las variables de una pieza (React no les suma unidades): sólo si su rejilla dibuja posiciones y la pieza trae la suya.
function variables(
  nombres: readonly [string, string, string],
  pieza: ConPosicion,
  corte: Corte | 'siempre' | undefined,
): CSSProperties | undefined {
  if (corte === undefined || pieza.posicion === undefined) return undefined
  const [columna, fila, alto] = nombres
  return {
    [columna]: String(pieza.posicion.columna),
    [fila]: String(pieza.posicion.fila),
    [alto]: String(pieza.alto ?? 1),
  } as CSSProperties
}

export const estiloDelItem = (item: ConPosicion, corte?: Corte | 'siempre') =>
  variables(['--pieza-columna', '--pieza-fila', '--pieza-alto'], item, corte)

export const estiloDeLaSeccion = (seccion: ConPosicion, corte?: Corte | 'siempre') =>
  variables(['--seccion-columna', '--seccion-fila', '--seccion-alto'], seccion, corte)

// El bloque del avanzado: la fila entera de su fila.
export const estiloDelBloque = (fila: number, corte?: Corte | 'siempre') =>
  estiloDeLaSeccion({ posicion: { columna: 1, fila } }, corte)

const deLasFilas = (nombre: string, filas: string | undefined): CSSProperties | undefined =>
  filas === undefined ? undefined : ({ [nombre]: filas } as CSSProperties)

export const estiloDeLaRejillaDeCeldas = (filas?: string) =>
  deLasFilas('--filas-de-la-seccion', filas)

export const estiloDeLaRejillaDeSecciones = (filas?: string) =>
  deLasFilas('--filas-de-las-secciones', filas)
