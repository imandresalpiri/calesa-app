import 'server-only'
import { z } from 'zod'
import {
  errorDePostgrest,
  fallo,
  MENSAJE_INESPERADO,
  ok,
  type ErrorPostgrest,
} from '@/shared/lib/errores'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { createClient } from '@/shared/lib/supabase/server'
import type { Json } from '@/shared/types/database.types'
import type { ClaveDeFormato, TipoDeArte } from '../entities/formatos'
import type { AmbitoDeImagen, TipoDeImagen, VisibilidadDeArte } from '../entities/tipos'

// Las escrituras de Artes: sólo por RPC `security definer` (`artes_plantilla_*`, `artes_por_defecto_poner`, `artes_imagen_*`), que repiten
// cada permiso y cada regla. Un error vuelve como valor: `PT409` es conflicto (con «Recargar»), 42501 sin permiso, P0002 no encontrado (lo
// que no se ve no existe), 23505 un id repetido de otra persona, 22023 y 23514 una regla con el campo en el `hint` y 23503 una imagen que se
// quitó mientras tanto.

export const MENSAJE_IMAGEN_QUE_YA_NO_ESTA = 'Una de las imágenes ya no existe.'
const NO_SE_LEYO = 'No pudimos leer la respuesta. Recarga para ver cómo quedó.'
// Los `hint` que nombran un campo del formulario: el motivo va junto a él.
const CAMPOS_DEL_HINT = new Set(['nombre', 'formato', 'origen', 'archivo', 'ambito'])

type ErrorDeLaRpc = ErrorPostgrest & { hint?: string | null }

export function falloDeArtes(error: ErrorDeLaRpc): ResultadoDeAccion<never> {
  if (error.code === 'P0002') {
    return fallo('no_encontrado', error.message)
  }
  if (error.code === '23503') {
    return fallo('regla', MENSAJE_IMAGEN_QUE_YA_NO_ESTA)
  }
  const base = errorDePostgrest(error)
  const campo = error.hint && CAMPOS_DEL_HINT.has(error.hint) ? error.hint : null
  const conCausa =
    error.hint && (error.code === '22023' || error.code === '23514')
      ? { ...base, causa: error.hint }
      : base
  return { ok: false, error: conCausa, ...(campo ? { porCampo: { [campo]: base.mensaje } } : {}) }
}

function respuesta<T>(esquema: z.ZodType<T>, data: unknown): ResultadoDeAccion<T> {
  const leida = esquema.safeParse(data)
  return leida.success ? ok(leida.data) : fallo('inesperado', NO_SE_LEYO)
}

const conVersion = z.object({ actualizado_en: z.string() })
const creada = z.object({ id: z.guid(), actualizado_en: z.string() })
export type Creada = z.infer<typeof creada>
export type ConVersion = z.infer<typeof conVersion>

export async function crearPlantilla(pedido: {
  id: string
  nombre: string
  formato: ClaveDeFormato
  ancho: number
  alto: number
  origenId: string
  documento: Json
}): Promise<ResultadoDeAccion<Creada>> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('artes_plantilla_crear', {
    p_id: pedido.id,
    p_nombre: pedido.nombre,
    p_formato: pedido.formato,
    p_ancho: pedido.ancho,
    p_alto: pedido.alto,
    p_origen: pedido.origenId,
    p_documento: pedido.documento,
  })
  return error ? falloDeArtes(error) : respuesta(creada, data)
}

export async function duplicarPlantilla(pedido: {
  idNuevo: string
  fuente: string
  nombre: string
}): Promise<ResultadoDeAccion<Creada>> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('artes_plantilla_duplicar', {
    p_id_nuevo: pedido.idNuevo,
    p_fuente: pedido.fuente,
    p_nombre: pedido.nombre,
  })
  return error ? falloDeArtes(error) : respuesta(creada, data)
}

export async function cambiarVisibilidad(pedido: {
  id: string
  actualizadoEnEsperado: string
  visibilidad: VisibilidadDeArte
}): Promise<ResultadoDeAccion<ConVersion>> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('artes_plantilla_visibilidad', {
    p_id: pedido.id,
    p_actualizado_en_esperado: pedido.actualizadoEnEsperado,
    p_visibilidad: pedido.visibilidad,
  })
  return error ? falloDeArtes(error) : respuesta(conVersion, data)
}

// Eliminar lo que ya no está (otra pestaña la borró) es lo pedido: no es un error.
export async function eliminarPlantilla(pedido: {
  id: string
  actualizadoEnEsperado: string
}): Promise<ResultadoDeAccion<{ id: string }>> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('artes_plantilla_eliminar', {
    p_id: pedido.id,
    p_actualizado_en_esperado: pedido.actualizadoEnEsperado,
  })
  if (error && error.code !== 'P0002') {
    return falloDeArtes(error)
  }
  return ok({ id: pedido.id })
}

const puesta = z.union([conVersion, z.object({ quitada: z.literal(true) })])

// `plantillaId` nulo la quita; `actualizadoEnEsperado` nulo dice que quien mira no tenía una en ese lugar (si ya hay, `PT409`).
export async function ponerPorDefecto(pedido: {
  origenId: string
  tipo: TipoDeArte
  plantillaId: string | null
  actualizadoEnEsperado: string | null
}): Promise<ResultadoDeAccion<z.infer<typeof puesta>>> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('artes_por_defecto_poner', {
    p_origen: pedido.origenId,
    p_tipo: pedido.tipo,
    // Los tipos generados no conocen el nulo: la RPC lo acepta en los dos (quitar y «no tenía»).
    p_plantilla: pedido.plantillaId as string,
    p_actualizado_en_esperado: pedido.actualizadoEnEsperado as string,
  })
  return error ? falloDeArtes(error) : respuesta(puesta, data)
}

export async function crearImagen(pedido: {
  id: string
  nombre: string
  ruta: string
  miniaturaRuta: string
  tipo: TipoDeImagen
  ancho: number
  alto: number
  ambito: AmbitoDeImagen
}): Promise<ResultadoDeAccion<Creada>> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('artes_imagen_crear', {
    p_id: pedido.id,
    p_nombre: pedido.nombre,
    p_ruta: pedido.ruta,
    p_miniatura_ruta: pedido.miniaturaRuta,
    p_tipo: pedido.tipo,
    p_ancho: pedido.ancho,
    p_alto: pedido.alto,
    p_ambito: pedido.ambito,
  })
  return error ? falloDeArtes(error) : respuesta(creada, data)
}

export async function renombrarImagen(pedido: {
  id: string
  actualizadoEnEsperado: string
  nombre: string
}): Promise<ResultadoDeAccion<ConVersion>> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('artes_imagen_renombrar', {
    p_id: pedido.id,
    p_actualizado_en_esperado: pedido.actualizadoEnEsperado,
    p_nombre: pedido.nombre,
  })
  return error ? falloDeArtes(error) : respuesta(conVersion, data)
}

// Cuántas plantillas de arte la usan, con tope: 101 dice «más de 100».
export async function usosDeLaImagen(pedido: { id: string }): Promise<ResultadoDeAccion<number>> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('artes_imagen_usos', { p_id: pedido.id })
  if (error) {
    return falloDeArtes(error)
  }
  return typeof data === 'number' ? ok(data) : fallo('inesperado', MENSAJE_INESPERADO)
}

const quitada = z.union([
  z.object({ quitada: z.literal(true) }),
  z.object({ usos: z.number().int().positive() }),
])
export type ImagenQuitada = z.infer<typeof quitada>

// Con usos no la quita: devuelve cuántas plantillas la usan.
export async function quitarImagen(pedido: {
  id: string
  actualizadoEnEsperado: string
}): Promise<ResultadoDeAccion<ImagenQuitada>> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('artes_imagen_quitar', {
    p_id: pedido.id,
    p_actualizado_en_esperado: pedido.actualizadoEnEsperado,
  })
  return error ? falloDeArtes(error) : respuesta(quitada, data)
}
