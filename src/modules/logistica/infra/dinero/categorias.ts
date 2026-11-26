import 'server-only'
import { z } from 'zod'
import { createClient } from '@/shared/lib/supabase/server'
import type { Json } from '@/shared/types/database.types'
import type { RepositorioDeCategorias } from '../../entities/dinero/repositorio-de-categorias'
import { rechazoDeCatalogo, resultadoDeCrear, resultadoDeGuardar } from '../nucleo/catalogos'
import { inesperado } from './rpc'

// Las categorías de gasto se escriben sólo por RPC (`security definer`): la base mira `logistica.catalogos.gestionar` en el origen de la propia o, para una
// compartida, en todos los orígenes que la usan, la unicidad por clave y la versión. Una con gastos no se borra (23503: que se desactive).
const CAMPOS = ['nombre', 'proposito', 'orden'] as const

const esquemaDeEliminada = z.object({ accion: z.literal('eliminada') })

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
  eliminar: async ({ id, actualizadoEn }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('categoria_gasto_eliminar', {
      p_id: id,
      p_actualizado_en_esperado: actualizadoEn,
    })
    if (error) {
      return rechazoDeCatalogo(error, CAMPOS)
    }
    return esquemaDeEliminada.safeParse(data).success ? { ok: true, data: { id } } : inesperado()
  },
}
