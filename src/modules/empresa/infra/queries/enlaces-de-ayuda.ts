import 'server-only'
import { cache } from 'react'
import { errorDePostgrest, fallo, MENSAJE_INESPERADO, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import {
  listaDeLaEmpresaDesde,
  TOPE_DE_ENLACES_DE_LA_EMPRESA,
} from '../../entities/enlaces-de-ayuda'
import { misEnlacesDesde } from '../../entities/mis-enlaces-de-ayuda'
import type { LectorDeEnlacesDeAyuda, LectorDeMisEnlacesDeAyuda } from '../../entities/repositorios'

// Los enlaces de ayuda de la empresa, para su tarjeta y su modal en Configuración › Empresa. Uno de más que el tope: la tarjeta dice
// «20+» y el modal sabe si está lleno. Es un catálogo de a lo sumo 30 filas (la base no deja más): se ordena en memoria sobre
// `enlaces_de_ayuda_pkey`, sin índice propio (`.claude/rules/escala.md`: las tablas de configuración no se miden).
export const getEnlacesDeAyuda: LectorDeEnlacesDeAyuda = cache(async () => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('enlaces_de_ayuda')
    .select('id, titulo, url, descripcion, orden, activo, actualizado_en')
    .order('orden')
    .order('id')
    .limit(TOPE_DE_ENLACES_DE_LA_EMPRESA + 1)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const lista = listaDeLaEmpresaDesde({ tope: TOPE_DE_ENLACES_DE_LA_EMPRESA, enlaces: data })
  return lista ? ok(lista) : fallo('inesperado', MENSAJE_INESPERADO)
})

// Lo de quien mira, para su tarjeta y su modal de Perfil: una RPC con los permisos de quien llama (la RLS deja ver sólo lo propio). Los
// de la empresa van por `enlaces_de_ayuda_pkey` con su tope y los suyos por `enlaces_de_ayuda_personales_usuario_orden_idx`.
export const getMisEnlacesDeAyuda: LectorDeMisEnlacesDeAyuda = cache(async () => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('enlaces_de_ayuda_de_mi')
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const leidos = misEnlacesDesde(data)
  return leidos ? ok(leidos) : fallo('inesperado', MENSAJE_INESPERADO)
})
