import 'server-only'
import { elementoDeCatalogoDesde } from '@/shared/lib/catalogo'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { RepositorioDeGruposDeCampos } from '../entities/repositorios'

// Los grupos de campos de los leads se escriben sólo por RPC (`lead_campo_grupo_*`, con `leads.campos.gestionar`). La base limpia el
// nombre y rechaza el que ya existe con otra escritura («Ya existe «X».», 23505).
const crear: RepositorioDeGruposDeCampos['crear'] = async (nombre) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('lead_campo_grupo_crear', { p_nombre: nombre })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(elementoDeCatalogoDesde(data))
}

export const gruposDeCamposSupabase: RepositorioDeGruposDeCampos = { crear }
