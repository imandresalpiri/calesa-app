import 'server-only'
import { elementoDeCatalogoDesde, rechazoDelCatalogo } from '@/shared/lib/catalogo'
import { ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { RepositorioDeGruposDelOrigen } from '../entities/repositorios'

// Los grupos de campos de un origen se escriben sólo por RPC (`origen_campo_grupo_*`, con `origenes.gestionar` y la versión). La base
// limpia el nombre y rechaza el que ya existe en ese origen con otra escritura («Ya existe «X».», 23505, hint `nombre`); un rechazo de un
// dato llega en `porCampo` (`rechazoDelCatalogo()`).
export const gruposDelOrigenSupabase: RepositorioDeGruposDelOrigen = {
  crear: async (origenId, nombre) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('origen_campo_grupo_crear', {
      p_origen: origenId,
      p_nombre: nombre,
    })
    return error ? rechazoDelCatalogo(error) : ok(elementoDeCatalogoDesde(data))
  },

  guardar: async ({ origenId, id, actualizadoEnEsperado, cambios }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('origen_campo_grupo_guardar', {
      p_origen: origenId,
      p_grupo: id,
      p_actualizado_en_esperado: actualizadoEnEsperado,
      p_cambios: cambios,
    })
    return error ? rechazoDelCatalogo(error) : ok(data)
  },

  mover: async ({ origenId, id, actualizadoEnEsperado, despuesDe }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('origen_campo_grupo_mover', {
      p_origen: origenId,
      p_grupo: id,
      p_actualizado_en_esperado: actualizadoEnEsperado,
      ...(despuesDe === null ? {} : { p_despues_de: despuesDe }),
    })
    return error ? rechazoDelCatalogo(error) : ok(data)
  },

  quitar: async ({ origenId, id, actualizadoEnEsperado, destino }) => {
    const supabase = await createClient()
    const { error } = await supabase.rpc('origen_campo_grupo_eliminar', {
      p_origen: origenId,
      p_grupo: id,
      p_actualizado_en_esperado: actualizadoEnEsperado,
      p_mover: destino.mover,
      ...(destino.mover && destino.destino !== null ? { p_destino: destino.destino } : {}),
    })
    return error ? rechazoDelCatalogo(error) : ok(null)
  },
}
