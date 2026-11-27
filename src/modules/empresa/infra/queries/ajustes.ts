import 'server-only'
import { connection } from 'next/server'
import { cache } from 'react'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { AJUSTES_POR_DEFECTO, ajustesDesde, type Ajustes } from '../../entities/ajustes'
import {
  LIMPIEZA_APAGADA,
  ajustesEmpresaDesde,
  politicaDeLimpiezaDesde,
  type PoliticaDeLimpieza,
} from '../../entities/ajustes-empresa'
import type { LectorDeAjustes } from '../../entities/repositorios'

// Una lectura por request, la pida quien la pida (layout, página, action). Funciona con y sin
// sesión: `web.ajustes_acceso()` es lo único de la empresa que `anon` puede leer.
export const getAjustes = cache(async (): Promise<Ajustes> => {
  // Se lee en cada request (el registro puede abrirse o cerrarse en cualquier momento): nunca
  // mientras Next prepara una ruta por adelantado, donde la consulta quedaría cortada.
  await connection()
  const supabase = await createClient()
  const { data, error } = await supabase.schema('web').rpc('ajustes_acceso').maybeSingle()
  const ajustes = error ? null : ajustesDesde(data)
  if (!ajustes) {
    // La pantalla se dibuja igual, con la identidad neutra y el registro cerrado.
    console.error('ajustes_acceso() no devolvió los ajustes de la empresa', error ?? data)
    return AJUSTES_POR_DEFECTO
  }
  return ajustes
})

// La fila entera, para el formulario de Configuración › Empresa, y si ya hay datos cargados (con
// ellos la moneda base no se cambia). La lee cualquier cuenta con sesión; guardarla exige permiso.
export const getAjustesParaEditar: LectorDeAjustes = cache(async () => {
  const supabase = await createClient()
  const [fila, conDatos] = await Promise.all([
    supabase.from('ajustes_empresa').select('*').eq('id', 1).single(),
    supabase.rpc('empresa_con_datos_cargados'),
  ])
  if (fila.error) {
    return { ok: false, error: errorDePostgrest(fila.error) }
  }
  if (conDatos.error) {
    return { ok: false, error: errorDePostgrest(conDatos.error) }
  }
  return ok({ ajustes: ajustesEmpresaDesde(fila.data), conDatosCargados: conDatos.data })
})

// La política de la limpieza automática (interruptor y días de gracia): lo que necesitan el listado
// de vehículos y la ficha. La lee cualquier cuenta con sesión y no tumba la pantalla: si no se
// puede leer, se da por apagada (no se promete una fecha que no se conoce).
export const getPoliticaDeLimpieza = cache(async (): Promise<PoliticaDeLimpieza> => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ajustes_empresa')
    .select('limpieza_automatica, limpieza_dias_gracia')
    .eq('id', 1)
    .maybeSingle()
  if (error || !data) {
    console.error('No se pudo leer la política de limpieza', error)
    return LIMPIEZA_APAGADA
  }
  return politicaDeLimpiezaDesde(data)
})

// Los días que una fase de logística tolera si no dice los suyos (`ajustes_empresa.demora_dias_default`, lo que usa `_logistica_dias`): la insignia «Demorada» de la
// página de la unidad. La lee cualquier cuenta con sesión; si no se puede leer, nulo (sólo alertan las fases con días propios: no se inventa una demora).
export const getDemoraPorDefecto = cache(async (): Promise<number | null> => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ajustes_empresa')
    .select('demora_dias_default')
    .eq('id', 1)
    .limit(1)
    .maybeSingle()
  if (error || !data) {
    console.error('No se pudo leer la demora por defecto', error)
    return null
  }
  return data.demora_dias_default
})
