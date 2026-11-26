import 'server-only'
import { errorDePostgrest, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { COLUMNAS_DE_CAMPO_DE_LEAD, camposDeLeadDesde } from '../../entities/campo'
import type { LectorDeLayoutDeLeads } from '../../entities/repositorios'

// El layout de los leads: todos sus campos (también los desactivados). Cualquier cuenta lo lee: los
// formularios, el listado y los filtros lo necesitan. Qué datos recibe de cada lead lo decide la
// base según la cartera, no esta lectura.
export const getLayoutDeLeads: LectorDeLayoutDeLeads = async () => {
  const supabase = await createClient()
  const { data, error } = await supabase.from('leads_campos').select(COLUMNAS_DE_CAMPO_DE_LEAD)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(camposDeLeadDesde(data))
}
