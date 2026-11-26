import { z } from 'zod'
import { textoDeUso } from '../nucleo/catalogos'

// Una categoría de gasto (6.11-1): sale de la base (`categorias_gasto`), ningún texto fijo la nombra; propia de un origen o compartida con todos (`origen_id` nulo).
// `proposito` es de la lista fija de la base (tributos, flete…). Se escribe sólo por RPC (`categoria_gasto_crear|guardar|eliminar`) con la versión de la fila.
const esquemaDeCategoria = z
  .object({
    id: z.guid(),
    origen_id: z.guid().nullable(),
    nombre: z.string(),
    proposito: z.string().nullable(),
    activo: z.boolean(),
    orden: z.number(),
    actualizado_en: z.string(),
  })
  .transform(({ origen_id, actualizado_en, ...resto }) => ({
    ...resto,
    origenId: origen_id,
    actualizadoEn: actualizado_en,
  }))

export type CategoriaDeGasto = {
  id: string
  // Nulo: compartida con todos los orígenes.
  origenId: string | null
  nombre: string
  proposito: string | null
  activo: boolean
  orden: number
  // La versión de la fila: la piden `categoria_gasto_guardar` y `categoria_gasto_eliminar`.
  actualizadoEn: string
}

/** Las filas de `categorias_gasto` (con `origen_id` y `actualizado_en`); nulo si alguna no tiene la forma esperada. */
export function categoriasDesde(datos: unknown): CategoriaDeGasto[] | null {
  const leido = z.array(esquemaDeCategoria).safeParse(datos)
  return leido.success ? leido.data : null
}

/** Las que se ofrecen al cargar o corregir un gasto: las activas y, si se corrige uno viejo, la suya aunque se haya desactivado. */
export function categoriasParaElegir(
  categorias: readonly CategoriaDeGasto[],
  actualId: string | null,
): CategoriaDeGasto[] {
  return categorias
    .filter((c) => c.activo || c.id === actualId)
    .sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre, 'es'))
}

// El `check` de `categorias_gasto.proposito` en la base: una lista cerrada, no un catálogo que la empresa edite (6.11-4, D8). `tributos` es el que lee Aduana para «tributos pagados».
export const PROPOSITOS_DE_CATEGORIA = [
  { valor: 'tributos', nombre: 'Tributos' },
  { valor: 'flete', nombre: 'Flete' },
  { valor: 'grua', nombre: 'Grúa' },
  { valor: 'chaperia', nombre: 'Chapería' },
  { valor: 'despachante', nombre: 'Despachante' },
  { valor: 'otro', nombre: 'Otro' },
] as const

export const SIN_PROPOSITO = 'Sin propósito'

export function nombreDelProposito(proposito: string | null): string {
  return PROPOSITOS_DE_CATEGORIA.find((p) => p.valor === proposito)?.nombre ?? SIN_PROPOSITO
}

export const LARGO_MAXIMO_DE_NOMBRE_DE_CATEGORIA = 60
export const ORDEN_MAXIMO_DE_CATEGORIA = 32767

/** Lo que escribe la persona en el formulario, tal cual (el orden como texto y el propósito vacío = sin propósito). */
export type BorradorDeCategoria = {
  nombre: string
  proposito: string
  activo: boolean
  orden: string
}

/** Lo validado, listo para mandar. */
export type DatosDeCategoria = {
  nombre: string
  proposito: string | null
  activo: boolean
  orden: number
}

export type ValidacionDeCategoria =
  { ok: true; datos: DatosDeCategoria } | { ok: false; errores: Record<string, string> }

/** El formulario vacío de «Nueva categoría»: activa y al final de lo que tenga el orden por omisión de la base. */
export const BORRADOR_NUEVO_DE_CATEGORIA: BorradorDeCategoria = {
  nombre: '',
  proposito: '',
  activo: true,
  orden: '0',
}

export function borradorDeCategoria(c: CategoriaDeGasto): BorradorDeCategoria {
  return {
    nombre: c.nombre,
    proposito: c.proposito ?? '',
    activo: c.activo,
    orden: String(c.orden),
  }
}

/** Valida el formulario con las reglas de la base (nombre, propósito de la lista, orden `smallint`). El error de cada campo va por su clave del borrador. */
export function validarCategoria(b: BorradorDeCategoria): ValidacionDeCategoria {
  const errores: Record<string, string> = {}
  const nombre = b.nombre.trim()
  if (nombre === '') {
    errores['nombre'] = 'Escribe el nombre.'
  } else if (nombre.length > LARGO_MAXIMO_DE_NOMBRE_DE_CATEGORIA) {
    errores['nombre'] =
      `El nombre admite hasta ${String(LARGO_MAXIMO_DE_NOMBRE_DE_CATEGORIA)} letras.`
  }
  if (b.proposito !== '' && !PROPOSITOS_DE_CATEGORIA.some((p) => p.valor === b.proposito)) {
    errores['proposito'] = 'Elige uno de los propósitos de la lista.'
  }
  const textoDelOrden = b.orden.trim()
  const orden = /^\d+$/.test(textoDelOrden) ? Number(textoDelOrden) : Number.NaN
  if (!(orden >= 0 && orden <= ORDEN_MAXIMO_DE_CATEGORIA)) {
    errores['orden'] = `El orden es un número entero de 0 a ${String(ORDEN_MAXIMO_DE_CATEGORIA)}.`
  }
  if (Object.keys(errores).length > 0) {
    return { ok: false, errores }
  }
  return {
    ok: true,
    datos: { nombre, proposito: b.proposito === '' ? null : b.proposito, activo: b.activo, orden },
  }
}

/** Sólo lo que cambió respecto de lo guardado; nulo si no hay nada que guardar. */
export function cambiosDeCategoria(
  original: CategoriaDeGasto,
  nuevo: DatosDeCategoria,
): Partial<DatosDeCategoria> | null {
  const cambios: Partial<DatosDeCategoria> = {}
  if (nuevo.nombre !== original.nombre) {
    cambios.nombre = nuevo.nombre
  }
  if (nuevo.proposito !== original.proposito) {
    cambios.proposito = nuevo.proposito
  }
  if (nuevo.activo !== original.activo) {
    cambios.activo = nuevo.activo
  }
  if (nuevo.orden !== original.orden) {
    cambios.orden = nuevo.orden
  }
  return Object.keys(cambios).length === 0 ? null : cambios
}

// Lo que dice una action antes de escribir si quien pide no tiene `logistica.catalogos.gestionar` en ningún origen (o en el de la propia que crea).
export const SIN_PERMISO_PARA_LAS_CATEGORIAS =
  'No tienes permiso para configurar los catálogos de logística.'

// Lo que usa una categoría (`_categoria_gasto_uso()`): sus gastos.
const USADA_POR = ['gasto', 'gastos'] as const

/** El aviso al desactivar una categoría con gastos: «Desactivaste «X»: la usan 12 gastos; siguen mostrándola.». */
export function textoDeUsoDeCategoria(nombre: string, uso: number): string {
  return textoDeUso({ nombre, uso, femenino: true, usadoPor: USADA_POR })
}
