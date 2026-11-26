import 'server-only'
import { createClient } from '@/shared/lib/supabase/server'
import type { Json } from '@/shared/types/database.types'
import type { RepositorioDeCatalogosDeTransporte } from '../../entities/transporte/repositorio-de-catalogos'
import { resultadoDeCrear, resultadoDeGuardar } from '../nucleo/catalogos'

// Puertos y navieras se escriben sólo por RPC (`security definer`): la base mira `logistica.catalogos.gestionar` en el origen del propio o, para un compartido, en
// todos los orígenes que lo usan, la unicidad por clave (sin mayúsculas, tildes ni espacios de más; un puerto sin país también) y la versión. No se borra: borrar
// dejaría nulos los transportes (D3).
const CAMPOS_DEL_PUERTO = ['nombre', 'pais', 'codigo', 'orden'] as const
const CAMPOS_DE_LA_NAVIERA = ['nombre'] as const

export const catalogosDeTransporteSupabase: RepositorioDeCatalogosDeTransporte = {
  crearPuerto: async ({ id, origenId, datos }) => {
    const supabase = await createClient()
    const respuesta = await supabase.rpc('puerto_crear', {
      p_id: id,
      // Nulo = compartido: los tipos generados no admiten nulo, la base sí.
      p_origen: origenId as string,
      p_datos: datos as Json,
    })
    return resultadoDeCrear(respuesta, CAMPOS_DEL_PUERTO)
  },
  guardarPuerto: async ({ id, actualizadoEn, cambios }) => {
    const supabase = await createClient()
    const respuesta = await supabase.rpc('puerto_guardar', {
      p_id: id,
      p_actualizado_en_esperado: actualizadoEn,
      p_cambios: cambios as Json,
    })
    return resultadoDeGuardar(respuesta, CAMPOS_DEL_PUERTO)
  },
  crearNaviera: async ({ id, origenId, datos }) => {
    const supabase = await createClient()
    const respuesta = await supabase.rpc('naviera_crear', {
      p_id: id,
      p_origen: origenId as string,
      p_datos: datos as Json,
    })
    return resultadoDeCrear(respuesta, CAMPOS_DE_LA_NAVIERA)
  },
  guardarNaviera: async ({ id, actualizadoEn, cambios }) => {
    const supabase = await createClient()
    const respuesta = await supabase.rpc('naviera_guardar', {
      p_id: id,
      p_actualizado_en_esperado: actualizadoEn,
      p_cambios: cambios as Json,
    })
    return resultadoDeGuardar(respuesta, CAMPOS_DE_LA_NAVIERA)
  },
}
