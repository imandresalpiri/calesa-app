import 'server-only'
import { z } from 'zod'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'

const esquema = z.array(z.object({ id: z.guid() }))

// Si quien pide ve una cotización guardada (fuera de la papelera): una lectura por clave primaria (`cotizaciones_pkey`, `limit(1)`) con su sesión, y decide
// la RLS «cotizaciones: leer». Antes de redactar con el asistente de IA sobre lo que se comparte.
export async function getCotizacionVisible(id: string): Promise<Resultado<boolean>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cotizaciones')
    .select('id')
    .eq('id', id)
    .is('eliminado_en', null)
    .limit(1)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const filas = esquema.safeParse(data)
  if (!filas.success) {
    return fallo('inesperado', 'No pudimos leer la cotización.')
  }
  return ok(filas.data.length > 0)
}
