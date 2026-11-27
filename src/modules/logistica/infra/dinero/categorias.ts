import 'server-only'
import { createClient } from '@/shared/lib/supabase/server'
import type { Json } from '@/shared/types/database.types'
import type { RepositorioDeCategorias } from '../../entities/dinero/repositorio-de-categorias'
import { resultadoDeCrear, resultadoDeGuardar } from '../nucleo/catalogos'

// Las categorías de gasto se escriben sólo por RPC (`security definer`): la base mira `logistica.catalogos.gestionar` en el origen de la propia o, para una
// compartida, en todos los orígenes que la usan, la unicidad por clave y la versión. No se borran: se desactivan.
const CAMPOS = ['nombre', 'proposito', 'orden'] as const

export const categoriasSupabase: RepositorioDeCategorias = {
  crear: async ({ id, origenId, datos }) => {
    const supabase = await createClient()
    const respuesta = await supabase.rpc('categoria_gasto_crear', {
      p_id: id,
      // Nulo = compartida: los tipos generados no admiten nulo, la base sí.
      p_origen: origenId as string,
      p_datos: datos as Json,
    })
    return resultadoDeCrear(respuesta, CAMPOS)
  },
  guardar: async ({ id, actualizadoEn, cambios }) => {
    const supabase = await createClient()
    const respuesta = await supabase.rpc('categoria_gasto_guardar', {
      p_id: id,
      p_actualizado_en_esperado: actualizadoEn,
      p_cambios: cambios as Json,
    })
    return resultadoDeGuardar(respuesta, CAMPOS)
  },
}
