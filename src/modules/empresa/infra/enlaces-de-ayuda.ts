import 'server-only'
import { errorDePostgrest, fallo as falloDe } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { Json } from '@/shared/types/database.types'
import { respuestaDeEnlacesDesde } from '../entities/enlaces-de-ayuda'
import { misEnlacesDesde } from '../entities/mis-enlaces-de-ayuda'
import type {
  RepositorioDeEnlacesDeAyuda,
  RepositorioDeMisEnlacesDeAyuda,
} from '../entities/repositorios'

// Los enlaces de ayuda se escriben sólo por RPC `security definer`: las de la empresa piden `empresa.ajustes.gestionar` y la versión
// del enlace (`PT409`); la de cada persona, estar activa y la versión de su lista. Todas devuelven lo releído: la pantalla no vuelve a leer.

const CAMPO_DEL_HINT: Record<string, string> = {
  titulo: 'titulo',
  url: 'url',
  descripcion: 'descripcion',
  tope: 'tope',
}

// «Crear la primera fila»: la base la toma como nula. Los tipos generados dan el argumento como `string` (la función no tiene valor por
// omisión) y un `undefined` no viaja en el JSON: tiene que ser un `null` explícito.
const ESPERADA_NULA = null as unknown as string

const NO_SE_LEYO = 'No pudimos leer la respuesta. Recarga para ver cómo quedó.'

function fallo(error: { code?: string | null; message: string; hint?: string | null }) {
  const campo = error.hint ? CAMPO_DEL_HINT[error.hint] : undefined
  return { ok: false as const, error: errorDePostgrest(error), ...(campo ? { campo } : {}) }
}

function respuesta(data: unknown) {
  const lista = respuestaDeEnlacesDesde(data)
  return lista ? { ok: true as const, data: lista } : falloDe('inesperado', NO_SE_LEYO)
}

export const enlacesDeAyudaSupabase: RepositorioDeEnlacesDeAyuda = {
  crear: async ({ id, titulo, url, descripcion }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('enlace_de_ayuda_crear', {
      p_id: id,
      p_titulo: titulo,
      p_url: url,
      ...(descripcion === null ? {} : { p_descripcion: descripcion }),
    })
    return error ? fallo(error) : respuesta(data)
  },
  guardar: async ({ id, actualizadoEnEsperado, titulo, url, descripcion, activo }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('enlace_de_ayuda_guardar', {
      p_id: id,
      p_actualizado_en_esperado: actualizadoEnEsperado,
      p_cambios: {
        ...(titulo === undefined ? {} : { titulo }),
        ...(url === undefined ? {} : { url }),
        ...(descripcion === undefined ? {} : { descripcion }),
        ...(activo === undefined ? {} : { activo }),
      },
    })
    return error ? fallo(error) : respuesta(data)
  },
  mover: async ({ id, actualizadoEnEsperado, direccion }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('enlace_de_ayuda_mover', {
      p_id: id,
      p_actualizado_en_esperado: actualizadoEnEsperado,
      p_direccion: direccion,
    })
    return error ? fallo(error) : respuesta(data)
  },
  quitar: async ({ id, actualizadoEnEsperado }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('enlace_de_ayuda_quitar', {
      p_id: id,
      p_actualizado_en_esperado: actualizadoEnEsperado,
    })
    return error ? fallo(error) : respuesta(data)
  },
}

export const misEnlacesDeAyudaSupabase: RepositorioDeMisEnlacesDeAyuda = {
  guardar: async ({ actualizadoEnEsperado, elementos }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('enlaces_de_ayuda_guardar_mios', {
      p_actualizado_en_esperado: actualizadoEnEsperado ?? ESPERADA_NULA,
      p_elementos: elementos as Json,
    })
    if (error) {
      return fallo(error)
    }
    const leidos = misEnlacesDesde(data)
    return leidos ? { ok: true as const, data: leidos } : falloDe('inesperado', NO_SE_LEYO)
  },
}
