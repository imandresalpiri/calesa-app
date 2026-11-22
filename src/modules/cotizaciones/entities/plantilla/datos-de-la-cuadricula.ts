// Todo dato que nombra la cuadrícula, aplanado y en orden, espejo de `_plantilla_cuadricula_datos()`: lo que miran las reglas de las variables y de los nodos, la
// lectura del lienzo y el contexto del navegador. Primero las filas (el nodo que la decide y los de sus condiciones) y después las celdas (su dato, los de su lista
// de respaldo, los de su texto con datos en orden o, de sus condiciones, rama por rama las condiciones y su contenido, y el «si no»). Una condición sobre un dato trae su dato con `es`; una sobre un
// nodo, su nodo con `es` y su `opcion`. Puro y lineal; se llama sobre una cuadrícula que ya pasó la forma.
import type {
  CeldaDeLaTarjeta,
  CondicionDeLaTarjeta,
  ContenidoSimple,
  DatoDeLaCelda,
  EsDeLaCondicion,
  FilaDeLaTarjeta,
  Mostrar,
  PlantillaEnCuadricula,
} from '../cuadricula-de-la-tarjeta'

export type DatoNombrado = {
  readonly lugar: 'filas' | 'celdas'
  readonly id: string
  readonly variable: string | null
  readonly nodo: string | null
  readonly mostrar: Mostrar | null
  readonly es: EsDeLaCondicion | null
  readonly opcion: string | null
}

type Lugar = Pick<DatoNombrado, 'lugar' | 'id'>

const NADA = { variable: null, nodo: null, mostrar: null, es: null, opcion: null } as const

const delDato = (l: Lugar, d: DatoDeLaCelda): DatoNombrado =>
  'variable' in d
    ? { ...l, ...NADA, variable: d.variable }
    : { ...l, ...NADA, nodo: d.nodo, mostrar: d.mostrar }

const deLaCondicion = (l: Lugar, c: CondicionDeLaTarjeta): DatoNombrado =>
  'dato' in c
    ? { ...delDato(l, c.dato), es: c.es }
    : { ...l, ...NADA, nodo: c.nodo, es: c.es, opcion: 'opcion' in c ? c.opcion : null }

const delSimple = (l: Lugar, c: ContenidoSimple): DatoNombrado[] =>
  c.tipo === 'dato' ? [delDato(l, c)] : []

function deLaFila(f: FilaDeLaTarjeta): DatoNombrado[] {
  const l: Lugar = { lugar: 'filas', id: f.id }
  return [
    ...(f.nodo === undefined ? [] : [{ ...l, ...NADA, nodo: f.nodo }]),
    ...(f.si ?? []).map((c) => deLaCondicion(l, c)),
  ]
}

function deLaCelda(c: CeldaDeLaTarjeta): DatoNombrado[] {
  const l: Lugar = { lugar: 'celdas', id: c.id }
  const x = c.contenido
  if (x.tipo === 'dato') return [delDato(l, x)]
  if (x.tipo === 'respaldo') return x.datos.map((d) => delDato(l, d))
  if (x.tipo === 'texto' && 'partes' in x)
    return x.partes.flatMap((p) => (typeof p === 'string' ? [] : [delDato(l, p)]))
  if (x.tipo !== 'condiciones') return []
  return [
    ...x.ramas.flatMap((r) => [
      ...r.si.map((s) => deLaCondicion(l, s)),
      ...delSimple(l, r.contenido),
    ]),
    ...delSimple(l, x.si_no),
  ]
}

export const datosNombrados = (p: PlantillaEnCuadricula): DatoNombrado[] => [
  ...p.filas.flatMap(deLaFila),
  ...p.celdas.flatMap(deLaCelda),
]

// `filas.<id>` o `celdas.<id>`: el `donde` de un rechazo.
export const dondeDelDato = (d: Lugar) => `${d.lugar}.${d.id}`

// Los datos que muestran algo de un nodo (los de las condiciones sobre un nodo no muestran nada).
export const conNodoYMostrar = (
  datos: readonly DatoNombrado[],
): (DatoNombrado & { nodo: string; mostrar: Mostrar })[] =>
  datos.flatMap((d) =>
    d.nodo !== null && d.mostrar !== null ? [{ ...d, nodo: d.nodo, mostrar: d.mostrar }] : [],
  )
