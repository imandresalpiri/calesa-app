import 'server-only'
import { errorDePostgrest, fallo as falloDe, MENSAJE_INESPERADO, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { respuestaDeLogosDesde, usosDelLogoDesde } from '../entities/logos'
import type { RepositorioDeLogos } from '../entities/repositorios'

// Las variantes del logo se escriben sólo por RPC `security definer` con `empresa.ajustes.gestionar` (renombrar y quitar, con la versión de la
// variante: `PT409`). Cada una devuelve la lista entera releída: la pantalla no vuelve a leer.

const CAMPOS_DEL_HINT = new Set(['nombre', 'archivo', 'tope'])
const NO_SE_LEYO = 'No pudimos leer la respuesta. Recarga para ver cómo quedó.'

function fallo(error: { code?: string | null; message: string; hint?: string | null }) {
  const campo = error.hint && CAMPOS_DEL_HINT.has(error.hint) ? error.hint : undefined
  return { ok: false as const, error: errorDePostgrest(error), ...(campo ? { campo } : {}) }
}

function respuesta(data: unknown) {
  const leida = respuestaDeLogosDesde(data)
  return leida ? { ok: true as const, data: leida } : falloDe('inesperado', NO_SE_LEYO)
}

export const logosSupabase: RepositorioDeLogos = {
  crear: async ({ id, nombre, ruta, tipo, ancho, alto }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('logo_variante_crear', {
      p_id: id,
      p_nombre: nombre,
      p_ruta: ruta,
      p_tipo: tipo,
      p_ancho: ancho,
      p_alto: alto,
    })
    return error ? fallo(error) : respuesta(data)
  },
  renombrar: async ({ id, actualizadoEnEsperado, nombre }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('logo_variante_renombrar', {
      p_id: id,
      p_actualizado_en_esperado: actualizadoEnEsperado,
      p_nombre: nombre,
    })
    return error ? fallo(error) : respuesta(data)
  },
  ordenar: async ({ ids }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('logo_variantes_ordenar', { p_ids: ids })
    return error ? fallo(error) : respuesta(data)
  },
  quitar: async ({ id, actualizadoEnEsperado }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('logo_variante_quitar', {
      p_id: id,
      p_actualizado_en_esperado: actualizadoEnEsperado,
    })
    return error ? fallo(error) : respuesta(data)
  },
  usos: async ({ id }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('logo_variante_usos', { p_id: id })
    if (error) {
      return { ok: false, error: errorDePostgrest(error) }
    }
    const usos = usosDelLogoDesde(data)
    return usos ? ok(usos) : falloDe('inesperado', MENSAJE_INESPERADO)
  },
}
