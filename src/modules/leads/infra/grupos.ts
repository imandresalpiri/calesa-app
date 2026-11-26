import 'server-only'
import { elementoDeCatalogoDesde, rechazoDelCatalogo } from '@/shared/lib/catalogo'
import { ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { RepositorioDeGruposDeCampos } from '../entities/repositorios'

// Los grupos de campos de los leads se escriben sólo por RPC (`lead_campo_grupo_*`, con `leads.campos.gestionar` y la versión). La base
// limpia el nombre y rechaza el que ya existe con otra escritura («Ya existe «X».», 23505, hint `nombre`); un rechazo de un dato llega
// en `porCampo` (`rechazoDelCatalogo()`).
export const gruposDeCamposSupabase: RepositorioDeGruposDeCampos = {
  crear: async (nombre) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('lead_campo_grupo_crear', { p_nombre: nombre })
    return error ? rechazoDelCatalogo(error) : ok(elementoDeCatalogoDesde(data))
  },

  guardar: async ({ id, actualizadoEnEsperado, cambios }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('lead_campo_grupo_guardar', {
      p_grupo: id,
      p_actualizado_en_esperado: actualizadoEnEsperado,
      p_cambios: cambios,
    })
    return error ? rechazoDelCatalogo(error) : ok(data)
  },

  mover: async ({ id, actualizadoEnEsperado, despuesDe }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('lead_campo_grupo_mover', {
      p_grupo: id,
      p_actualizado_en_esperado: actualizadoEnEsperado,
      ...(despuesDe === null ? {} : { p_despues_de: despuesDe }),
    })
    return error ? rechazoDelCatalogo(error) : ok(data)
  },

  quitar: async ({ id, actualizadoEnEsperado, destino }) => {
    const supabase = await createClient()
    const { error } = await supabase.rpc('lead_campo_grupo_eliminar', {
      p_grupo: id,
      p_actualizado_en_esperado: actualizadoEnEsperado,
      p_mover: destino.mover,
      ...(destino.mover && destino.destino !== null ? { p_destino: destino.destino } : {}),
    })
    return error ? rechazoDelCatalogo(error) : ok(null)
  },
}
