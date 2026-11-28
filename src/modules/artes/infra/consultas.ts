// Las lecturas de Artes, escritas una vez con el cliente como parámetro: el servidor lee la primera página y el navegador «Ver más». Todo con
// la sesión de quien mira: la RLS deja ver las plantillas de arte de los orígenes donde ve cotizaciones (las privadas, sólo a su autor) y las
// imágenes de la empresa más las personales propias. Columnas explicitas, nunca el documento. Las miniaturas del bucket privado `artes` se
// firman por 600 s, todas las de una página en una sola llamada.
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import {
  codificarCursor,
  leerCursor,
  TAMANO_DE_VER_MAS,
  TOPE_DE_LO_CARGADO,
  type OrdenDeCursor,
} from '@/shared/lib/paginacion'
import { aplicarCursor, ordenarPorCursor } from '@/shared/lib/supabase/consultas'
import type { Database } from '@/shared/types/database.types'
import type { PedidoDePlantillas } from '../entities/filtros'
import { CLAVES_DE_FORMATO } from '../entities/formatos'
import type { ImagenDeArte, PaginaDeArtes, PlantillaDeArte, PorDefecto } from '../entities/tipos'

export type Cliente = SupabaseClient<Database>

const BUCKET = 'artes'
export const SEGUNDOS_DE_LA_MINIATURA = 600
const POR_ACTUALIZACION: OrdenDeCursor = { columna: 'actualizado_en', ascendente: false }

export const NO_SE_LEYERON_LAS_PLANTILLAS = 'No se pudieron cargar las plantillas de arte.'
export const NO_SE_LEYERON_LAS_IMAGENES = 'No se pudieron cargar las imágenes.'

const COLUMNAS_DE_PLANTILLA =
  'id, nombre, formato, ancho, alto, origen_id, visibilidad, autor_id, miniatura_ruta, actualizado_en, autor:perfiles!artes_plantillas_autor_id_fkey(nombre)'
const COLUMNAS_DE_IMAGEN =
  'id, nombre, tipo, ancho, alto, ambito, dueno_id, miniatura_ruta, actualizado_en'

const esquemaDePlantilla = z.object({
  id: z.guid(),
  nombre: z.string(),
  formato: z.enum(CLAVES_DE_FORMATO),
  ancho: z.number().int(),
  alto: z.number().int(),
  origen_id: z.guid(),
  visibilidad: z.enum(['privada', 'empresa']),
  autor_id: z.guid(),
  miniatura_ruta: z.string().nullable(),
  actualizado_en: z.string(),
  autor: z.object({ nombre: z.string().nullable() }).nullable(),
})

const esquemaDeImagen = z.object({
  id: z.guid(),
  nombre: z.string(),
  tipo: z.enum(['webp', 'png', 'jpg', 'svg']),
  ancho: z.number().int(),
  alto: z.number().int(),
  ambito: z.enum(['personal', 'empresa']),
  dueno_id: z.guid().nullable(),
  miniatura_ruta: z.string(),
  actualizado_en: z.string(),
})

const esquemaDePorDefecto = z.object({
  origen_id: z.guid(),
  tipo: z.enum(['imagen', 'pdf']),
  plantilla_id: z.guid(),
  actualizado_en: z.string(),
})

// Las URL firmadas de una página, por ruta. Si la firma falla, la tarjeta dibuja su marcador: la lista no cae por una miniatura.
async function firmar(cliente: Cliente, rutas: readonly string[]): Promise<Map<string, string>> {
  const unicas = [...new Set(rutas)]
  if (unicas.length === 0) {
    return new Map()
  }
  const { data, error } = await cliente.storage
    .from(BUCKET)
    .createSignedUrls(unicas, SEGUNDOS_DE_LA_MINIATURA)
  if (error) {
    console.error('artes: no se pudieron firmar las miniaturas')
    return new Map()
  }
  return new Map(
    data.flatMap((f): [string, string][] =>
      f.error === null && f.path !== null && f.signedUrl ? [[f.path, f.signedUrl]] : [],
    ),
  )
}

function pagina<Fila extends { id: string; actualizadoEn: string }>(
  leidas: Fila[],
): PaginaDeArtes<Fila> {
  const filas = leidas.slice(0, TAMANO_DE_VER_MAS)
  const ultima = filas.at(-1)
  return {
    filas,
    siguiente:
      leidas.length > TAMANO_DE_VER_MAS && ultima
        ? codificarCursor({ instante: ultima.actualizadoEn, id: ultima.id, sentido: 'siguiente' })
        : null,
  }
}

// Una página de plantillas de arte, de la más reciente a la más vieja. Índices: sin filtro, `artes_plantillas_recientes_idx`; por origen,
// `artes_plantillas_origen_idx`; «Mías», `artes_plantillas_autor_idx`. Es una tabla de configuración (decenas de filas por persona).
export async function leerPlantillas(
  cliente: Cliente,
  { pedido, yo, cursor: texto }: { pedido: PedidoDePlantillas; yo: string; cursor: string | null },
): Promise<Resultado<PaginaDeArtes<PlantillaDeArte>>> {
  const cursor = leerCursor(texto)
  let consulta = cliente.from('artes_plantillas').select(COLUMNAS_DE_PLANTILLA)
  if (pedido.origenId !== null) {
    consulta = consulta.eq('origen_id', pedido.origenId)
  }
  if (pedido.formato !== null) {
    consulta = consulta.eq('formato', pedido.formato)
  }
  if (pedido.de === 'mias') {
    consulta = consulta.eq('autor_id', yo)
  }
  if (pedido.de === 'empresa') {
    consulta = consulta.eq('visibilidad', 'empresa')
  }
  consulta = ordenarPorCursor(
    aplicarCursor(consulta, cursor, POR_ACTUALIZACION),
    cursor,
    POR_ACTUALIZACION,
  )
  const { data, error } = await consulta.limit(TAMANO_DE_VER_MAS + 1)
  if (error) {
    console.error('artes: no se pudo leer la lista de plantillas de arte')
    return {
      ok: false,
      error: { ...errorDePostgrest(error), mensaje: NO_SE_LEYERON_LAS_PLANTILLAS },
    }
  }
  const leidas = z.array(esquemaDePlantilla).safeParse(data)
  if (!leidas.success) {
    return fallo('inesperado', NO_SE_LEYERON_LAS_PLANTILLAS)
  }
  const urls = await firmar(
    cliente,
    leidas.data
      .slice(0, TAMANO_DE_VER_MAS)
      .flatMap((f) => (f.miniatura_ruta === null ? [] : [f.miniatura_ruta])),
  )
  return ok(
    pagina(
      leidas.data.map((f) => ({
        id: f.id,
        nombre: f.nombre,
        formato: f.formato,
        ancho: f.ancho,
        alto: f.alto,
        origenId: f.origen_id,
        visibilidad: f.visibilidad,
        autorId: f.autor_id,
        autorNombre: f.autor?.nombre ?? null,
        miniaturaUrl: f.miniatura_ruta === null ? null : (urls.get(f.miniatura_ruta) ?? null),
        actualizadoEn: f.actualizado_en,
      })),
    ),
  )
}

// Una página de la biblioteca de imágenes (las de la empresa y las personales propias, por RLS), por `artes_imagenes_recientes_idx`.
export async function leerImagenes(
  cliente: Cliente,
  { cursor: texto }: { cursor: string | null },
): Promise<Resultado<PaginaDeArtes<ImagenDeArte>>> {
  const cursor = leerCursor(texto)
  const consulta = ordenarPorCursor(
    aplicarCursor(
      cliente.from('artes_imagenes').select(COLUMNAS_DE_IMAGEN),
      cursor,
      POR_ACTUALIZACION,
    ),
    cursor,
    POR_ACTUALIZACION,
  )
  const { data, error } = await consulta.limit(TAMANO_DE_VER_MAS + 1)
  if (error) {
    console.error('artes: no se pudo leer la biblioteca de imágenes')
    return { ok: false, error: { ...errorDePostgrest(error), mensaje: NO_SE_LEYERON_LAS_IMAGENES } }
  }
  const leidas = z.array(esquemaDeImagen).safeParse(data)
  if (!leidas.success) {
    return fallo('inesperado', NO_SE_LEYERON_LAS_IMAGENES)
  }
  const urls = await firmar(
    cliente,
    leidas.data.slice(0, TAMANO_DE_VER_MAS).map((f) => f.miniatura_ruta),
  )
  return ok(
    pagina(
      leidas.data.map((f) => ({
        id: f.id,
        nombre: f.nombre,
        tipo: f.tipo,
        ancho: f.ancho,
        alto: f.alto,
        ambito: f.ambito,
        duenoId: f.dueno_id,
        miniaturaUrl: urls.get(f.miniatura_ruta) ?? null,
        actualizadoEn: f.actualizado_en,
      })),
    ),
  )
}

// Las plantillas por defecto de quien mira (la RLS deja leer sólo las propias): una por origen y tipo, con tope.
export async function leerPorDefecto(cliente: Cliente): Promise<Resultado<PorDefecto[]>> {
  const { data, error } = await cliente
    .from('artes_por_defecto')
    .select('origen_id, tipo, plantilla_id, actualizado_en')
    .limit(TOPE_DE_LO_CARGADO)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const leidas = z.array(esquemaDePorDefecto).safeParse(data)
  if (!leidas.success) {
    return fallo('inesperado', NO_SE_LEYERON_LAS_PLANTILLAS)
  }
  return ok(
    leidas.data.map((f) => ({
      origenId: f.origen_id,
      tipo: f.tipo,
      plantillaId: f.plantilla_id,
      actualizadoEn: f.actualizado_en,
    })),
  )
}
