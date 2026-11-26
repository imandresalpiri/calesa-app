// Los catálogos del formulario de gasto, leídos desde el navegador (6.11-1): categorías, monedas y tipos de cambio. Son catálogos de la empresa (decenas de filas: ver
// `TABLAS_ACOTADAS` en las guardas de escala) y se recuerdan un rato, una memoria por juego de orígenes. Las categorías, las compartidas y las propias de los orígenes de las unidades
// (sin orígenes, sólo las compartidas), con las compartidas al final para que el tope corte una compartida antes que la propia que la tapa; qué se ofrece lo decide
// `categoriasParaElegir()`.
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { memoriaDeLectura, type MemoriaDeLectura } from '@/shared/lib/memoria-de-lectura'
import { createClient } from '@/shared/lib/supabase/browser'
import { z } from 'zod'
import { categoriasDesde, type CategoriaDeGasto } from '../../entities/dinero/categoria'
import { tiposDeCambioDesde, type TipoDeCambio } from '../../entities/dinero/tipo-de-cambio'

export type Moneda = { codigo: string; nombre: string; simbolo: string }
export type OpcionesDeGasto = {
  // Los orígenes de las unidades para los que se leyeron las categorías (los pide `categoriasParaElegir`).
  origenes: string[]
  categorias: CategoriaDeGasto[]
  monedas: Moneda[]
  tiposDeCambio: TipoDeCambio[]
}

export const NO_SE_CARGARON_LAS_OPCIONES = 'No se pudieron cargar las opciones del gasto.'

const MINUTOS_QUE_SE_RECUERDA = 2
// Juegos de orígenes recordados a la vez: pasado el tope se olvidan todos (cada uno es una lectura chica).
const TOPE_DE_MEMORIAS = 20

const esquemaDeMonedas = z.array(
  z.object({ codigo: z.string(), nombre: z.string(), simbolo: z.string() }),
)

function leerCategorias(origenes: readonly string[]) {
  const todas = createClient()
    .from('categorias_gasto')
    .select('id, origen_id, nombre, proposito, activo, orden, actualizado_en')
  const deLosOrigenes =
    origenes.length === 0
      ? todas.is('origen_id', null)
      : todas.or(`origen_id.is.null,origen_id.in.(${origenes.join(',')})`)
  return deLosOrigenes
    .order('origen_id', { nullsFirst: false })
    .order('orden')
    .order('nombre')
    .limit(200)
}

async function leer(origenes: string[]): Promise<Resultado<OpcionesDeGasto>> {
  const supabase = createClient()
  const [categorias, monedas, tipos] = await Promise.all([
    leerCategorias(origenes),
    supabase
      .from('monedas')
      .select('codigo, nombre, simbolo')
      .eq('activa', true)
      .order('orden')
      .limit(100),
    supabase
      .from('tipos_cambio')
      .select('id, nombre, moneda_de, moneda_a, valor, es_default, activo, orden')
      .eq('activo', true)
      .order('orden')
      .limit(200),
  ])
  const error = categorias.error ?? monedas.error ?? tipos.error
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const listaDeCategorias = categoriasDesde(categorias.data)
  const listaDeMonedas = esquemaDeMonedas.safeParse(monedas.data)
  const listaDeTipos = tiposDeCambioDesde(tipos.data)
  if (!listaDeCategorias || !listaDeMonedas.success || !listaDeTipos) {
    return fallo('inesperado', NO_SE_CARGARON_LAS_OPCIONES)
  }
  return ok({
    origenes,
    categorias: listaDeCategorias,
    monedas: listaDeMonedas.data,
    tiposDeCambio: listaDeTipos,
  })
}

const memorias = new Map<string, MemoriaDeLectura<OpcionesDeGasto>>()

/** Las opciones del gasto para unidades de estos orígenes (vacío = sólo las categorías compartidas). */
export function leerOpcionesDeGasto(
  origenes: readonly string[],
): Promise<Resultado<OpcionesDeGasto>> {
  const distintos = [...new Set(origenes)].sort()
  const clave = distintos.join(',')
  let memoria = memorias.get(clave)
  if (!memoria) {
    if (memorias.size >= TOPE_DE_MEMORIAS) {
      memorias.clear()
    }
    memoria = memoriaDeLectura(() => leer(distintos), MINUTOS_QUE_SE_RECUERDA * 60_000)
    memorias.set(clave, memoria)
  }
  return memoria.leer()
}
