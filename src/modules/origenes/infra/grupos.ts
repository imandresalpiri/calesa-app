import 'server-only'
import { elementoDeCatalogoDesde } from '@/shared/lib/catalogo'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { RepositorioDeGruposDelOrigen } from '../entities/repositorios'

// Los grupos de campos de un origen se escriben sólo por RPC (`origen_campo_grupo_*`, con `origenes.gestionar`). La base limpia el nombre
// y rechaza el que ya existe en ese origen con otra escritura («Ya existe «X».», 23505).
const crear: RepositorioDeGruposDelOrigen['crear'] = async (origenId, nombre) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('origen_campo_grupo_crear', {
    p_origen: origenId,
    p_nombre: nombre,
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(elementoDeCatalogoDesde(data))
}

export const gruposDelOrigenSupabase: RepositorioDeGruposDelOrigen = { crear }
