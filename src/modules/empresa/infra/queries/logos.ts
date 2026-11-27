import 'server-only'
import { cache } from 'react'
import { errorDePostgrest, fallo, MENSAJE_INESPERADO, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { listaDeLogosDesde } from '../../entities/logos'
import type { LectorDeLogos } from '../../entities/repositorios'

// Las variantes del logo, en una sola llamada (`logos_empresa_leer()`): «Principal» y «Para fondo oscuro» de `ajustes_empresa` (por su PK) y las
// demás de `logos_empresa` por `logos_empresa_orden_idx`, con `limit` del tope + 1: a lo sumo 14 elementos. Es configuración: no se mide con volumen.
export const getLogos: LectorDeLogos = cache(async () => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('logos_empresa_leer')
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const lista = listaDeLogosDesde(data)
  return lista ? ok(lista) : fallo('inesperado', MENSAJE_INESPERADO)
})
