import { z } from 'zod'
import { esHex } from '@/shared/lib/color'
import {
  ALINEAR,
  ALINEAR_VERTICAL,
  BORDES,
  ES_CON_NUMERO,
  ES_SOBRE_UN_DATO,
  MOSTRAR,
  OCULTAR_SI,
  TAMANOS_DE_LETRA,
  type LecturaEnCuadricula,
  type PlantillaEnCuadricula,
  type TamanoDeLetra,
} from '../cuadricula-de-la-tarjeta'
import { MAXIMO_DE_DECIMALES } from '../nodos'

// Lo que devuelve `cotizacion_tarjeta(p_formula)` leído con Zod, en la forma que usa la geometría: la cuadrícula (la forma 2, ya convertida si era de la forma 1)
// y sólo lo que nombra, del nivel «todos» (K4 de `supabase/tests/cotizacion-tarjeta.sql`). Todo lo que se busca por el id de un nodo, un grupo, un bucket, un
// modo o un color es un `Map`: un id como «constructor» es legal y un objeto lo encontraría en su prototipo. `sin_plantilla`: el origen no tiene una plantilla
// publicada o no le sirve a esa versión; la base no dice nada más. La cuadrícula ya la validó la base: aquí se leen sus tipos y sus listas cerradas.

const id = z.string().min(1)
const entero = z.number().int().positive()
const borde = z.enum(BORDES)
const tamano = z.custom<TamanoDeLetra>(
  (v) => typeof v === 'number' && (TAMANOS_DE_LETRA as readonly number[]).includes(v),
)

const texto = z.object({ tipo: z.literal('texto'), texto: z.string() })
const vacio = z.object({ tipo: z.literal('vacio') })
const esquemaDelDato = z.union([
  z.object({ tipo: z.literal('dato'), variable: id }),
  z.object({ tipo: z.literal('dato'), nodo: id, mostrar: z.enum(MOSTRAR) }),
])
const esquemaDeLaCondicion = z.discriminatedUnion('es', [
  z.object({ es: z.enum(ES_SOBRE_UN_DATO), dato: esquemaDelDato }),
  z.object({ es: z.enum(['cero', 'no_cero', 'encendido', 'apagado']), nodo: id }),
  z.object({ es: z.enum(ES_CON_NUMERO), nodo: id, a: z.number() }),
  z.object({ es: z.literal('opcion'), nodo: id, opcion: id }),
])
const condiciones = z.array(esquemaDeLaCondicion).min(1)
const esquemaSimple = z.union([texto, esquemaDelDato, vacio])
// El texto con datos: sus partes, cada una un texto o un dato.
const textoConDatos = z.object({
  tipo: z.literal('texto'),
  partes: z.array(z.union([z.string(), esquemaDelDato])).min(1),
})

const esquemaDelContenido = z.union([
  textoConDatos,
  texto,
  esquemaDelDato,
  z.object({ tipo: z.literal('logo') }),
  z.object({ tipo: z.literal('foto_del_asesor') }),
  vacio,
  z.object({ tipo: z.literal('respaldo'), datos: z.array(esquemaDelDato).min(1) }),
  z.object({
    tipo: z.literal('condiciones'),
    ramas: z.array(z.object({ si: condiciones, contenido: esquemaSimple })).min(1),
    si_no: esquemaSimple,
  }),
])

const esquemaDelEstilo = z.object({
  fondo: id.optional(),
  texto: id.optional(),
  negrita: z.boolean().optional(),
  cursiva: z.boolean().optional(),
  tamano: tamano.optional(),
  alinear: z.enum(ALINEAR).optional(),
  alinear_vertical: z.enum(ALINEAR_VERTICAL).optional(),
  bordes: z
    .object({
      todos: borde.optional(),
      arriba: borde.optional(),
      derecha: borde.optional(),
      abajo: borde.optional(),
      izquierda: borde.optional(),
    })
    .optional(),
})

export const esquemaDeLaCuadricula = z.object({
  forma: z.literal(2),
  columnas: z.array(z.object({ id, ancho: entero })),
  filas: z.array(
    z.object({
      id,
      alto: entero,
      ocultar_si: z.enum(OCULTAR_SI),
      nodo: id.optional(),
      si: condiciones.optional(),
    }),
  ),
  celdas: z.array(
    z.object({
      id,
      fila: id,
      columna: id,
      abarca_columnas: entero.optional(),
      abarca_filas: entero.optional(),
      contenido: esquemaDelContenido,
      estilo: esquemaDelEstilo.optional(),
    }),
  ),
})

// Los «Decimales» de una celda (glosario), como los valida la forma de la fórmula.
const decimales = z.int().min(0).max(MAXIMO_DE_DECIMALES)

const tipoDeCambio = z.object({ nombre: z.string().nullable(), nodo: z.string().nullable() })
const porBucket = z.record(z.string(), tipoDeCambio)

const esquemaListo = z.object({
  estado: z.literal('lista'),
  definicion: esquemaDeLaCuadricula,
  nodos: z.array(
    z.object({
      id,
      etiqueta: z.string().nullable(),
      descripcion: z.string().nullable(),
      grupo: z.string().nullable(),
      pct: z.string().nullable(),
      decimales: decimales.optional(),
      decimales_del_pct: decimales.optional(),
    }),
  ),
  grupos: z.array(
    z.object({
      id,
      etiqueta: z.string().nullable(),
      plazo: z.string().nullable(),
      bucket: z.string().nullable(),
    }),
  ),
  tipos_de_cambio: z.object({ buckets: porBucket, modos: z.record(z.string(), porBucket) }),
  modos: z.array(z.object({ clave: z.string(), nombre: z.string().nullable() })),
  variante: z
    .object({ nodo: id, opciones: z.array(z.object({ clave: id, titulo: z.string() })) })
    .nullable()
    .optional(),
  colores: z.array(z.object({ clave: id, hex: z.string().refine(esHex) })),
  total: z.object({ nodo: z.string().nullable() }),
})

const esquemaDeLaLectura = z.discriminatedUnion('estado', [
  esquemaListo,
  z.object({ estado: z.literal('sin_plantilla') }),
])

export type NodoDeLaTarjeta = {
  etiqueta: string
  descripcion: string | null
  grupo: string | null
  pct: string | null
  // Los «Decimales» del nodo (su monto) y los del `pct` (su porcentaje); sin ellos, «Automático».
  decimales?: number
  decimalesDelPct?: number
}
export type GrupoDeLaTarjeta = { etiqueta: string; plazo: string | null; bucket: string | null }
export type TipoDeCambioDeLaTarjeta = { nombre: string | null; nodo: string | null }

export type TarjetaLista = {
  estado: 'lista'
  definicion: PlantillaEnCuadricula
  nodos: ReadonlyMap<string, NodoDeLaTarjeta>
  grupos: ReadonlyMap<string, GrupoDeLaTarjeta>
  tiposDeCambio: {
    buckets: ReadonlyMap<string, TipoDeCambioDeLaTarjeta>
    modos: ReadonlyMap<string, ReadonlyMap<string, TipoDeCambioDeLaTarjeta>>
  }
  // El nombre de cada modo de tipo de cambio, por su clave (sólo si la plantilla muestra `modo_tc`).
  modos: ReadonlyMap<string, string>
  variante: { nodo: string; opciones: readonly { clave: string; titulo: string }[] } | null
  // El hex de cada color del catálogo que nombran los estilos; uno que no está se dibuja `auto`.
  colores: ReadonlyMap<string, string>
  total: { nodo: string | null }
}

export type LecturaDeLaTarjeta = TarjetaLista | { estado: 'sin_plantilla' }

// Las dos claves sólo si llegaron: un nodo sin «Decimales» queda igual que antes.
const decimalesDelNodo = (
  decimales: number | undefined,
  delPct: number | undefined,
): Pick<NodoDeLaTarjeta, 'decimales' | 'decimalesDelPct'> => ({
  ...(decimales === undefined ? {} : { decimales }),
  ...(delPct === undefined ? {} : { decimalesDelPct: delPct }),
})

// La lectura plana (la de la vista previa de Configuración y la que cruza props) en la forma que usa la geometría.
export function lecturaDesdeLaPlana(l: LecturaEnCuadricula): TarjetaLista {
  const modos = new Map<string, Map<string, TipoDeCambioDeLaTarjeta>>()
  for (const m of l.tiposDeCambio.modos) {
    const delModo = modos.get(m.modo) ?? new Map<string, TipoDeCambioDeLaTarjeta>()
    delModo.set(m.bucket, { nombre: m.nombre, nodo: m.nodo })
    modos.set(m.modo, delModo)
  }
  return {
    estado: 'lista',
    definicion: l.definicion,
    nodos: new Map(
      l.nodos.map((n) => [
        n.id,
        {
          etiqueta: n.etiqueta,
          descripcion: n.descripcion,
          grupo: n.grupo,
          pct: n.pct,
          ...decimalesDelNodo(n.decimales, n.decimalesDelPct),
        },
      ]),
    ),
    grupos: new Map(
      l.grupos.map((g) => [g.id, { etiqueta: g.etiqueta, plazo: g.plazo, bucket: g.bucket }]),
    ),
    tiposDeCambio: {
      buckets: new Map(
        l.tiposDeCambio.buckets.map((b) => [b.bucket, { nombre: b.nombre, nodo: b.nodo }]),
      ),
      modos,
    },
    modos: new Map(l.modos.map((m) => [m.clave, m.nombre])),
    variante: l.variante,
    colores: new Map(l.colores.map((c) => [c.clave, c.hex.toLowerCase()])),
    total: l.total,
  }
}

const tiposDeCambioDe = (registro: Record<string, TipoDeCambioDeLaTarjeta>) =>
  new Map(Object.entries(registro))

// La respuesta de la base ya en la forma que usa la geometría, o nulo si no es lo que la base promete.
export function tarjetaDesde(crudo: unknown): LecturaDeLaTarjeta | null {
  const leida = esquemaDeLaLectura.safeParse(crudo)
  if (!leida.success) return null
  const t = leida.data
  if (t.estado === 'sin_plantilla') return { estado: 'sin_plantilla' }
  return {
    estado: 'lista',
    definicion: t.definicion as PlantillaEnCuadricula,
    nodos: new Map(
      t.nodos.map((n) => [
        n.id,
        {
          etiqueta: n.etiqueta ?? '',
          descripcion: n.descripcion,
          grupo: n.grupo,
          pct: n.pct,
          ...decimalesDelNodo(n.decimales, n.decimales_del_pct),
        },
      ]),
    ),
    grupos: new Map(
      t.grupos.map((g) => [
        g.id,
        { etiqueta: g.etiqueta ?? g.id, plazo: g.plazo, bucket: g.bucket },
      ]),
    ),
    tiposDeCambio: {
      buckets: tiposDeCambioDe(t.tipos_de_cambio.buckets),
      modos: new Map(
        Object.entries(t.tipos_de_cambio.modos).map(([k, v]) => [k, tiposDeCambioDe(v)]),
      ),
    },
    modos: new Map(t.modos.map((m) => [m.clave, m.nombre ?? m.clave])),
    variante: t.variante ?? null,
    colores: new Map(t.colores.map((c) => [c.clave, c.hex.toLowerCase()])),
    total: t.total,
  }
}
