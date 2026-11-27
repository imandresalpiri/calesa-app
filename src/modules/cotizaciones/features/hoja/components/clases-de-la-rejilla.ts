// Las clases que dibujan el aspecto de la hoja (docs/GLOSARIO.md › «Aspecto» y «Rejilla de la hoja»; la regla en `entities/rejilla-de-la-hoja.ts`): todo
// va en clases y variables sobre los nodos que ya existen, ningún nodo nuevo. Tailwind no ve una clase armada con un trozo: cada una va escrita entera en su
// tabla. Sin aspecto, cada función devuelve la clase de siempre, letra por letra (lo fija `clases-de-la-rejilla.test.ts`).
//
// Los ítems se miden contra su sección (el contenedor sin nombre más cercano) y las secciones contra `@container/secciones`. Bajo el primer corte todo
// ocupa las 12 pistas y no hay hueco de columna: al 200 % los 11 huecos no caben (docs/LECCIONES.md › «Interfaz»).
import type { AspectoDeCabecera, AspectoDeSeccion } from '../../../entities/aspecto-de-la-hoja'
import type { AnchoDeCelda, Enfasis, Letra } from '../../../entities/diseno'
import {
  altoSirve,
  COLUMNAS_DE_LA_REJILLA,
  columnasDeLaCelda,
  corteDe,
  SECCION_AUTOMATICA,
  type Corte,
  type Posicion,
} from '../../../entities/rejilla-de-la-hoja'
import {
  corteConPosicion,
  FILAS_DE_LA_REJILLA_DE_CELDAS,
  FILAS_DE_LA_REJILLA_DE_SECCIONES,
  POSICION_DE_LA_SECCION,
  POSICION_DEL_ITEM,
} from './clases-de-la-posicion'

// Los cortes a los que llega `corteDe()` (los demás nunca salen).
type CorteUsado = 'lg' | '2xl' | '3xl' | '5xl' | '7xl'
type Filas = Readonly<Record<2 | 3 | 4, string>>

export const COLUMNAS_DEL_ITEM: Readonly<Record<number, string>> = {
  1: 'col-span-12 @7xl:col-span-1',
  2: 'col-span-12 @7xl:col-span-2',
  3: 'col-span-12 @5xl:col-span-3',
  4: 'col-span-12 @3xl:col-span-4',
  5: 'col-span-12 @2xl:col-span-5',
  6: 'col-span-12 @lg:col-span-6',
  7: 'col-span-12 @lg:col-span-7',
  8: 'col-span-12 @lg:col-span-8',
  9: 'col-span-12 @lg:col-span-9',
  10: 'col-span-12 @lg:col-span-10',
  11: 'col-span-12 @lg:col-span-11',
  12: 'col-span-12',
}
export const FILAS_DEL_ITEM: Readonly<Record<CorteUsado, Filas>> = {
  lg: { 2: '@lg:row-span-2', 3: '@lg:row-span-3', 4: '@lg:row-span-4' },
  '2xl': { 2: '@2xl:row-span-2', 3: '@2xl:row-span-3', 4: '@2xl:row-span-4' },
  '3xl': { 2: '@3xl:row-span-2', 3: '@3xl:row-span-3', 4: '@3xl:row-span-4' },
  '5xl': { 2: '@5xl:row-span-2', 3: '@5xl:row-span-3', 4: '@5xl:row-span-4' },
  '7xl': { 2: '@7xl:row-span-2', 3: '@7xl:row-span-3', 4: '@7xl:row-span-4' },
}

// La sección «Automática» (sin ancho): la mitad desde 64 rem del contenedor de las secciones, como siempre.
export const COLUMNAS_DE_LA_SECCION: Readonly<Record<number | 'AUTOMATICA', string>> = {
  AUTOMATICA: 'col-span-12 @5xl/secciones:col-span-6',
  1: 'col-span-12 @7xl/secciones:col-span-1',
  2: 'col-span-12 @7xl/secciones:col-span-2',
  3: 'col-span-12 @5xl/secciones:col-span-3',
  4: 'col-span-12 @3xl/secciones:col-span-4',
  5: 'col-span-12 @2xl/secciones:col-span-5',
  6: 'col-span-12 @lg/secciones:col-span-6',
  7: 'col-span-12 @lg/secciones:col-span-7',
  8: 'col-span-12 @lg/secciones:col-span-8',
  9: 'col-span-12 @lg/secciones:col-span-9',
  10: 'col-span-12 @lg/secciones:col-span-10',
  11: 'col-span-12 @lg/secciones:col-span-11',
  12: 'col-span-12',
}
export const FILAS_DE_LA_SECCION: Readonly<Record<CorteUsado, Filas>> = {
  lg: {
    2: '@lg/secciones:row-span-2',
    3: '@lg/secciones:row-span-3',
    4: '@lg/secciones:row-span-4',
  },
  '2xl': {
    2: '@2xl/secciones:row-span-2',
    3: '@2xl/secciones:row-span-3',
    4: '@2xl/secciones:row-span-4',
  },
  '3xl': {
    2: '@3xl/secciones:row-span-2',
    3: '@3xl/secciones:row-span-3',
    4: '@3xl/secciones:row-span-4',
  },
  '5xl': {
    2: '@5xl/secciones:row-span-2',
    3: '@5xl/secciones:row-span-3',
    4: '@5xl/secciones:row-span-4',
  },
  '7xl': {
    2: '@7xl/secciones:row-span-2',
    3: '@7xl/secciones:row-span-3',
    4: '@7xl/secciones:row-span-4',
  },
}

// El relleno de una sección (o de la cabecera hecha caja), la separación entre sus celdas y la densidad de sus celdas (la XCell lee `--xcell-*`).
export const RELLENO = { chico: 'p-2', medio: 'p-4', grande: 'p-6' } as const
export const SEPARACION = {
  chica: 'gap-y-2 @lg:gap-x-2',
  media: 'gap-y-3 @lg:gap-x-3',
  grande: 'gap-y-5 @lg:gap-x-5',
} as const
export const DENSIDAD = {
  comoda: '',
  compacta:
    '[--xcell-relleno:calc(var(--spacing)*1)] [--xcell-separacion:calc(var(--spacing)*0.5)] [--xcell-alto:40px]',
} as const
// La letra pisa `--text-sm` (la de la XCell, los chips, las leyendas y la franja) con otro token que nadie pisa: sin ciclos.
export const LETRA = {
  chica: '[--text-sm:var(--text-xs)]',
  normal: '',
  grande: '[--text-sm:var(--text-base)]',
} as const
// El título de una sección, como en V1: chico, en mayúsculas por CSS y en la tinta suave. Sube con la letra grande y no baja con la chica.
export const TITULO = {
  chica: 'text-(length:--text-xs) font-semibold tracking-wide text-(--color-ink-soft) uppercase',
  normal: 'text-(length:--text-xs) font-semibold tracking-wide text-(--color-ink-soft) uppercase',
  grande: 'text-(length:--text-sm) font-semibold tracking-wide text-(--color-ink-soft) uppercase',
} as const
// El peso se hereda (valor, entrada y chips); las etiquetas conservan el suyo.
export const ENFASIS = { normal: '', fuerte: 'font-semibold' } as const

// Las secciones, en su propio contenedor con nombre y en la rejilla de 12 pistas (`secciones-de-la-hoja.tsx` y la vista previa del diseño).
export const CONTENEDOR_DE_SECCIONES = '@container/secciones min-w-0'
export const REJILLA_DE_SECCIONES =
  'grid grid-cols-12 items-start gap-x-0 gap-y-4 @lg/secciones:gap-x-4'

// Desde qué corte dibuja posiciones una rejilla (`entities/posiciones-de-la-hoja.ts`); sin él, el flujo de siempre.
type CorteDeSuRejilla = Corte | 'siempre' | undefined

const unir = (...partes: (string | false | undefined)[]) =>
  partes.filter((p): p is string => typeof p === 'string' && p !== '').join(' ')

const deTexto = (a: { letra?: keyof typeof LETRA; enfasis?: keyof typeof ENFASIS }) =>
  unir(LETRA[a.letra ?? 'normal'], ENFASIS[a.enfasis ?? 'normal'])

function filas(
  tabla: Readonly<Record<CorteUsado, Filas>>,
  columnas: number,
  alto: number | undefined,
) {
  if (alto === undefined || alto < 2 || !altoSirve(columnas)) return undefined
  const corte = corteDe(columnas)
  return corte === 'siempre' ? undefined : tabla[corte as CorteUsado][alto as 2 | 3 | 4]
}

// Lo que el lugar de un ítem lee: lo comparten el ítem de la hoja y el del diseño.
export type LugarDelItem = (
  | { tipo: 'celda'; ancho: AnchoDeCelda }
  | { tipo: 'atajos' | 'variante' | 'interruptor' | 'subtotal' | 'total'; ancho?: number }
) & { alto?: number; letra?: Letra; enfasis?: Enfasis; posicion?: Posicion }

// La posición de una pieza si su rejilla la dibuja (`corte`) y la pieza la trae; con más de una fila, lo de adentro estira para llenarlas.
const enSuLugar = (
  tabla: Readonly<Record<string, string>>,
  pieza: { posicion?: Posicion; alto?: number },
  corte: CorteDeSuRejilla,
): { clase?: string; estira: boolean } =>
  corte === undefined || pieza.posicion === undefined
    ? { estira: false }
    : { clase: tabla[corteConPosicion(corte)], estira: (pieza.alto ?? 1) > 1 }

// Un ítem en la rejilla de su sección: sus columnas (la celda, con nombre o en número; los demás, toda la fila si no dicen), sus filas desde el mismo corte
// (lo de adentro estira para llenarlas), y su letra y énfasis. Con el corte de su rejilla, además su posición desde ese corte (`estiloDelItem()`).
export function claseDelItem(item: LugarDelItem, corte?: CorteDeSuRejilla): string {
  const columnas =
    item.tipo === 'celda' ? columnasDeLaCelda(item.ancho) : (item.ancho ?? COLUMNAS_DE_LA_REJILLA)
  const conFilas = filas(FILAS_DEL_ITEM, columnas, item.alto)
  const lugar = enSuLugar(POSICION_DEL_ITEM, item, corte)
  return unir(
    COLUMNAS_DEL_ITEM[columnas] ?? COLUMNAS_DEL_ITEM[COLUMNAS_DE_LA_REJILLA],
    conFilas,
    lugar.clase,
    (conFilas !== undefined || lugar.estira) && '[&>*]:h-full',
    deTexto(item),
  )
}

// Una sección en la rejilla de las secciones (sólo la de la hoja: en el modal «Avanzado» un `col-span-12` crearía pistas de más). Con el corte de la
// rejilla, además su posición desde ese corte (`estiloDeLaSeccion()`).
export function claseDeLaSeccionEnLaRejilla(
  seccion: AspectoDeSeccion,
  corte?: CorteDeSuRejilla,
): string {
  const columnas = seccion.ancho ?? SECCION_AUTOMATICA.columnas
  const base =
    seccion.ancho === undefined
      ? COLUMNAS_DE_LA_SECCION.AUTOMATICA
      : (COLUMNAS_DE_LA_SECCION[seccion.ancho] ?? COLUMNAS_DE_LA_SECCION.AUTOMATICA)
  const conFilas =
    seccion.ancho === undefined && seccion.alto !== undefined && seccion.alto > 1
      ? FILAS_DE_LA_SECCION[SECCION_AUTOMATICA.corte][seccion.alto as 2 | 3 | 4]
      : filas(FILAS_DE_LA_SECCION, columnas, seccion.alto)
  const lugar = enSuLugar(POSICION_DE_LA_SECCION, seccion, corte)
  return unir(
    base,
    conFilas,
    lugar.clase,
    (conFilas !== undefined || lugar.estira) && 'self-stretch',
  )
}

// La rejilla de las secciones: con el corte, sus filas desde él (`estiloDeLaRejillaDeSecciones()`).
export const claseDeLaRejillaDeSecciones = (corte?: CorteDeSuRejilla): string =>
  corte === undefined
    ? REJILLA_DE_SECCIONES
    : `${REJILLA_DE_SECCIONES} ${FILAS_DE_LA_REJILLA_DE_SECCIONES[corteConPosicion(corte)]}`

// El bloque del avanzado (docs/GLOSARIO.md › «Bloque del avanzado»): una fila entera con el total suelto, «Avanzado» y el cierre, cada uno a lo ancho y
// con el espacio de la rejilla entre ellos. Con el corte, en su fila (`estiloDelBloque()`).
export const claseDelBloque = (corte?: CorteDeSuRejilla): string =>
  corte === undefined
    ? 'col-span-12 grid min-w-0 grid-cols-12 gap-y-4'
    : `col-span-12 grid min-w-0 grid-cols-12 gap-y-4 ${POSICION_DE_LA_SECCION[corteConPosicion(corte)]}`

// El marco de la sección: su relleno, su densidad, su letra y su énfasis; con tono, el borde del tono (sin él, el de siempre). El fondo queda en el token.
// Sin marco (las secciones del modal «Avanzado», como en V1): sin borde, fondo ni relleno; conserva el contenedor, la densidad, la letra y el énfasis.
export function claseDelMarcoDeLaSeccion(
  seccion: AspectoDeSeccion,
  { sinMarco = false }: { sinMarco?: boolean } = {},
): string {
  if (sinMarco) {
    return unir(
      '@container grid min-w-0 content-start gap-3',
      DENSIDAD[seccion.densidad ?? 'comoda'],
      deTexto(seccion),
    )
  }
  const borde =
    seccion.tono === undefined
      ? 'border-(--color-line)'
      : 'border-[color:var(--tono-borde,var(--color-line))]'
  return unir(
    `@container grid min-w-0 content-start gap-3 rounded-(--radius-card) border ${borde} bg-(--color-surface)`,
    RELLENO[seccion.relleno ?? 'medio'],
    DENSIDAD[seccion.densidad ?? 'comoda'],
    deTexto(seccion),
  )
}

// La rejilla de las celdas de una sección: con el corte, sus filas desde él (`estiloDeLaRejillaDeCeldas()`).
export const claseDeLaRejillaDeCeldas = (
  seccion: AspectoDeSeccion,
  corte?: CorteDeSuRejilla,
): string =>
  unir(
    `grid grid-cols-12 gap-x-0 ${SEPARACION[seccion.separacion ?? 'media']}`,
    corte !== undefined && FILAS_DE_LA_REJILLA_DE_CELDAS[corteConPosicion(corte)],
  )

export const claseDelTitulo = (seccion: AspectoDeSeccion): string =>
  TITULO[seccion.letra ?? 'normal']

// La cabecera va en la fila de las barras (baja): su relleno es más chico que el de una sección, para que la caja no la haga crecer de alto.
const RELLENO_DE_LA_CABECERA = {
  chico: 'px-2 py-0.5',
  medio: 'px-3 py-1',
  grande: 'px-4 py-2',
} as const

// La cabecera es una fila chica que se parte si no cabe (los modos, «Ver total» y el ⚙): con tono o relleno se dibuja como una caja (borde, radio y relleno), si no, suelta.
export function claseDeLaCabecera(cabecera: AspectoDeCabecera): string {
  const caja = cabecera.tono !== undefined || cabecera.relleno !== undefined
  const borde =
    cabecera.tono === undefined
      ? 'border-(--color-line)'
      : 'border-[color:var(--tono-borde,var(--color-line))]'
  return unir(
    'flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1',
    caja && `rounded-(--radius-card) border ${borde} bg-(--color-surface)`,
    caja && RELLENO_DE_LA_CABECERA[cabecera.relleno ?? 'medio'],
    deTexto(cabecera),
  )
}
