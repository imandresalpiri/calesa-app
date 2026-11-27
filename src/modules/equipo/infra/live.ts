import 'server-only'
import { cache } from 'react'
import { z } from 'zod'
import { errorDePostgrest, fallo, ok } from '@/shared/lib/errores'
import { TAMANO_DE_PERSONAS_DEL_LIVE } from '@/shared/lib/paginacion'
import { createClient } from '@/shared/lib/supabase/server'
import { ajustesParaLaBase } from '../entities/live'
import { ajustesDeLosRolesDesde, personasDelLiveDesde } from '../entities/live-configuracion'
import type {
  LectorDeAjustesDeLosRoles,
  LectorDePersonasDelLive,
  RepositorioDelLive,
} from '../entities/repositorios-live'
import { TOPE_DE_ROLES_PARA_ELEGIR } from '../entities/rol'

// Crear la fila (el rol «Por defecto», la persona sin lo propio): la base la toma como nula. Los tipos generados dan el argumento como `string` y un
// `undefined` no viaja en el JSON: tiene que ser un `null` explícito.
const ESPERADA_NULA = null as unknown as string

const NO_SE_LEYO = 'No pudimos leer la respuesta. Recarga para ver cómo quedó.'

// Los roles en su orden (la `roles_pkey` y el orden por `orden`, `nombre`; decenas de filas) y las filas de `live_ajustes_roles` (una por rol,
// por su PK), pedidos con uno de más que el tope y unidos acá. Una vez por request.
export const getAjustesDeLosRoles: LectorDeAjustesDeLosRoles = cache(async () => {
  const supabase = await createClient()
  const [roles, filas] = await Promise.all([
    supabase
      .from('roles')
      .select('id, nombre')
      .order('orden')
      .order('nombre')
      .limit(TOPE_DE_ROLES_PARA_ELEGIR + 1),
    supabase
      .from('live_ajustes_roles')
      .select('rol_id, ajustes, actualizado_en')
      .limit(TOPE_DE_ROLES_PARA_ELEGIR + 1),
  ])
  if (roles.error) {
    return { ok: false, error: errorDePostgrest(roles.error) }
  }
  if (filas.error) {
    return { ok: false, error: errorDePostgrest(filas.error) }
  }
  return ok(ajustesDeLosRolesDesde(roles.data, filas.data, TOPE_DE_ROLES_PARA_ELEGIR))
})

// `live_personas()`: sin texto, por `live_ajustes_personas_actualizado_idx` (cursor `(actualizado_en, usuario_id)`); con texto, por el trigram de
// `perfiles` como `equipo_lista()`. Una página y una de más.
export const getPersonasDelLive: LectorDePersonasDelLive = cache(async ({ texto, cursor }) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('live_personas', {
    ...(texto === null ? {} : { p_texto: texto }),
    ...(cursor === null ? {} : { p_cursor_en: cursor.en, p_cursor_id: cursor.id }),
    p_limite: TAMANO_DE_PERSONAS_DEL_LIVE + 1,
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(personasDelLiveDesde(data))
})

const esquemaDeLaVersion = z.string()
const esquemaDeLaVersionONula = z.string().nullable()

export const liveSupabase: RepositorioDelLive = {
  guardarRol: async ({ rolId, ajustes, actualizadoEnEsperado }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('live_rol_guardar', {
      p_rol: rolId,
      p_ajustes: ajustesParaLaBase(ajustes),
      p_actualizado_en_esperado: actualizadoEnEsperado ?? ESPERADA_NULA,
    })
    if (error) {
      return { ok: false, error: errorDePostgrest(error) }
    }
    const version = esquemaDeLaVersion.safeParse(data)
    return version.success ? ok({ actualizadoEn: version.data }) : fallo('inesperado', NO_SE_LEYO)
  },
  quitarRol: async ({ rolId, actualizadoEnEsperado }) => {
    const supabase = await createClient()
    const { error } = await supabase.rpc('live_rol_quitar', {
      p_rol: rolId,
      p_actualizado_en_esperado: actualizadoEnEsperado,
    })
    return error ? { ok: false, error: errorDePostgrest(error) } : ok(null)
  },
  guardarPersona: async ({ usuarioId, ajustes, actualizadoEnEsperado }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('live_persona_guardar', {
      p_usuario: usuarioId,
      p_ajustes: ajustesParaLaBase(ajustes),
      p_actualizado_en_esperado: actualizadoEnEsperado ?? ESPERADA_NULA,
    })
    if (error) {
      return { ok: false, error: errorDePostgrest(error) }
    }
    const version = esquemaDeLaVersionONula.safeParse(data)
    return version.success ? ok({ actualizadoEn: version.data }) : fallo('inesperado', NO_SE_LEYO)
  },
  quitarPersona: async ({ usuarioId, actualizadoEnEsperado }) => {
    const supabase = await createClient()
    const { error } = await supabase.rpc('live_persona_quitar', {
      p_usuario: usuarioId,
      p_actualizado_en_esperado: actualizadoEnEsperado,
    })
    return error ? { ok: false, error: errorDePostgrest(error) } : ok(null)
  },
}
