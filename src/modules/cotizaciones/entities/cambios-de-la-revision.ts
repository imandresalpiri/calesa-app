// Qué dejó una revisión, dicho en una línea (4.15-3b): los nodos que cambiaron (sus etiquetas), las columnas que se nombran y, si el nivel de quien mira lo deja ver, el total.
// Puro: el diff ya llega recortado por la base, así que lo que un nivel esconde no está acá y no se puede delatar. Ningún texto de la base se dibuja, salvo las etiquetas
// del diseño que quien mira ya ve.
import type { Formato } from './nodos'
import type {
  CambioDeVehiculo,
  EtiquetasDeRevisiones,
  NombreDeVehiculo,
  RevisionDeLaCotizacion,
} from './revisiones'

// Cuántos cambios se ven por revisión; el resto va como «y N más».
export const CAMBIOS_A_LA_VISTA = 3

// Un cálculo que esta revisión pisó o devolvió al calculado (`docs/COTIZADOR.md` › «Pisar un cálculo»): «Pisó «Transferencia a USA»: $480 → $500» y «Volvió al
// calculado «Transferencia a USA»». Lleva los números y su formato, no un texto: el dinero lo dibuja la pantalla con `<Monto>`.
export type CambioDeCalculo = {
  tipo: 'pisado' | 'devuelto'
  etiqueta: string
  // De cuánto a cuánto; nulo si el valor no cambió (se escribió lo mismo que daba).
  valores: { de: number | null; a: number | null } | null
  formato: Formato
  // Los «Decimales» del cálculo (glosario); sin la clave, «Automático».
  decimales?: number
}

// Un cambio a la vista: su texto, o un cálculo pisado o devuelto.
export type Cambio = string | CambioDeCalculo

export type CambiosDeLaRevision = {
  // Los primeros cambios, ya con su texto o sus números.
  vistos: Cambio[]
  // Cuántos más hay en esta fila (un largo de lo que ya llegó, no un conteo de la base).
  masN: number
  total: { de: number; a: number } | null
  // Ni un cambio que nombrar ni un total: sólo cambió lo que quien mira no ve.
  sinCambios: boolean
}

const objeto = (valor: unknown): Record<string, unknown> | null =>
  typeof valor === 'object' && valor !== null && !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : null

// Las claves de `diff[columna].de` y `.a`.
function nodosDe(diff: Readonly<Record<string, unknown>>, columna: string): string[] {
  const lados = objeto(diff[columna])
  return ['de', 'a'].flatMap((lado) => Object.keys(objeto(lados?.[lado]) ?? {}))
}

const lado = (diff: Readonly<Record<string, unknown>>, columna: string) =>
  objeto(diff[columna])?.['a']

// Las columnas que se nombran, en este orden. `total_base`, `formula_id`, `estado`, `plantilla_id`, `moneda_mostrar` y lo demás no.
const COLUMNAS: readonly [string, (a: unknown) => string | null][] = [
  [
    'clase',
    (a) => (a === 'final' ? 'Pasó a final' : a === 'preventa' ? 'Volvió a preventa' : null),
  ],
  ['modo_tc', () => 'Cambió el modo de tipo de cambio'],
  [
    'ver_total_bs',
    (a) => (a === true ? 'Encendió «Ver total Bs»' : a === false ? 'Apagó «Ver total Bs»' : null),
  ],
  // La marca de privada (glosario: «Cotización privada»): aprobarla o marcarla final también la hace pública.
  ['privada', (a) => (a === true ? 'La hizo privada' : a === false ? 'La hizo pública' : null)],
  ['vehiculo_id', () => 'Cambió el vehículo'],
  ['lead_id', () => 'Cambió el cliente'],
  ['titulo', () => 'Cambió el título'],
  // Pasar de automático a manual (o al revés) también es cambiar el título; con `titulo` en el mismo diff se dice una vez (abajo, sin repetir textos).
  ['titulo_manual', () => 'Cambió el título'],
  ['notas', () => 'Cambió las notas'],
  // Los retoques de la tarjeta: la revisión guarda cuántos (`{celdas, filas_ocultas}` o nulo por lado), nunca los textos; volver a la plantilla también es retocar.
  ['tarjeta_retoques', () => 'Retocó la tarjeta'],
  ['tipos_cambio', () => 'Cambió un tipo de cambio'],
  [
    'eliminado_en',
    (a) => (a === null || a === undefined ? 'Volvió de la papelera' : 'Fue a la papelera'),
  ],
]

// Los cálculos que quien mira ve, con su formato y sus decimales (los de `EtiquetasDeRevisiones`).
export type DeLosCalculos = Pick<EtiquetasDeRevisiones, 'calculos' | 'decimales'>
const SIN_CALCULOS: DeLosCalculos = { calculos: new Map(), decimales: new Map() }

const numeroDe = (valor: unknown): number | null => (typeof valor === 'number' ? valor : null)

const esOverride = (diff: Readonly<Record<string, unknown>>, lado: 'de' | 'a', id: string) =>
  objeto(objeto(diff['fuentes'])?.[lado])?.[id] === 'override'

function valoresDelNodo(
  diff: Readonly<Record<string, unknown>>,
  id: string,
): CambioDeCalculo['valores'] {
  const valores = objeto(diff['valores'])
  const de = objeto(valores?.['de']) ?? {}
  const a = objeto(valores?.['a']) ?? {}
  return id in de || id in a ? { de: numeroDe(de[id]), a: numeroDe(a[id]) } : null
}

// Lo pisado: la fuente pasó a `override` en un cálculo que quien mira ve (`calculos`, con su formato y sus decimales); lo devuelto, al revés. Por etiqueta.
function cambiosDeCalculos(
  diff: Readonly<Record<string, unknown>>,
  ids: readonly string[],
  etiquetas: ReadonlyMap<string, string>,
  { calculos, decimales }: DeLosCalculos,
): (CambioDeCalculo & { id: string })[] {
  return ids
    .flatMap((id) => {
      const formato = calculos.get(id)
      const antes = esOverride(diff, 'de', id)
      const despues = esOverride(diff, 'a', id)
      if (formato === undefined || antes === despues) {
        return []
      }
      const tipo = despues ? ('pisado' as const) : ('devuelto' as const)
      const etiqueta = etiquetas.get(id) ?? id
      const d = decimales.get(id)
      return [
        {
          id,
          tipo,
          etiqueta,
          valores: valoresDelNodo(diff, id),
          formato,
          ...(d === undefined ? {} : { decimales: d }),
        },
      ]
    })
    .sort((x, y) => x.etiqueta.localeCompare(y.etiqueta, 'es'))
}

function totalDe(diff: Readonly<Record<string, unknown>>): CambiosDeLaRevision['total'] {
  const totales = objeto(diff['totales'])
  const de = objeto(totales?.['de'])?.['usd']
  const a = objeto(totales?.['a'])?.['usd']
  return typeof de === 'number' && typeof a === 'number' ? { de, a } : null
}

const textoDelLado = (nombre: NombreDeVehiculo) =>
  nombre === 'sin'
    ? 'sin vehículo'
    : nombre === 'oculto'
      ? 'un vehículo que no puedes ver'
      : nombre.titulo

// El cambio de vehículo con sus nombres (T315): «Cambió el vehículo: A → B».
export const textoDelCambioDeVehiculo = (cambio: CambioDeVehiculo) =>
  `Cambió el vehículo: ${textoDelLado(cambio.de)} → ${textoDelLado(cambio.a)}`

// `vehiculo`: el cambio de vehículo ya nombrado al leer (`conVehiculos()`). Con él, va **primero**: con otro vehículo cambian muchos nodos, y al final quedaría en «y N más».
// Sin él (no se pudieron leer los nombres), «Cambió el vehículo» en su lugar de siempre. Después, lo pisado y lo devuelto (`calculos`: los cálculos que quien mira
// ve, con su formato y sus decimales), en vez del «Cambió «X»» de esos nodos.
export function cambiosDeLaRevision(
  diff: RevisionDeLaCotizacion['diff'],
  etiquetas: ReadonlyMap<string, string>,
  vehiculo: CambioDeVehiculo | null = null,
  calculos: DeLosCalculos = SIN_CALCULOS,
): CambiosDeLaRevision {
  const ids = [...new Set([...nodosDe(diff, 'valores'), ...nodosDe(diff, 'fuentes')])]
  const deCalculos = cambiosDeCalculos(diff, ids, etiquetas, calculos)
  const dichos = new Set(deCalculos.map((c) => c.id))
  const nodos = ids
    .filter((id) => !dichos.has(id))
    .map((id) => etiquetas.get(id) ?? id)
    .sort((x, y) => x.localeCompare(y, 'es'))
    .map((etiqueta) => `Cambió «${etiqueta}»`)
  const columnas = [
    ...new Set(
      COLUMNAS.flatMap(([columna, texto]) =>
        columna in diff && !(columna === 'vehiculo_id' && vehiculo !== null)
          ? [texto(lado(diff, columna))]
          : [],
      ).filter((texto) => texto !== null),
    ),
  ]
  const primero = vehiculo === null ? [] : [textoDelCambioDeVehiculo(vehiculo)]
  const pisados = deCalculos.map(({ id: _id, ...cambio }): Cambio => cambio)
  const todos: Cambio[] = [...primero, ...pisados, ...nodos, ...columnas]
  const total = totalDe(diff)
  return {
    vistos: todos.slice(0, CAMBIOS_A_LA_VISTA),
    masN: Math.max(0, todos.length - CAMBIOS_A_LA_VISTA),
    total,
    sinCambios: todos.length === 0 && total === null,
  }
}
