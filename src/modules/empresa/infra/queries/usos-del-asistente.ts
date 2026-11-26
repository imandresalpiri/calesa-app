import 'server-only'
import { connection } from 'next/server'
import { cache } from 'react'
import { errorDePostgrest } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { usosDelMes } from '../../entities/asistente-ia/usos'
import type { LectorDeUsosDelAsistente } from '../../entities/repositorios'

// Los usos del asistente de IA de este mes: hasta 6 personas y cuántas, con tope (`limit 6` y `limit 101` sobre
// `asistente_ia_usos_mes_usos_idx`). La RLS decide: quien gestiona la empresa ve a todas; los demás, lo suyo.
export const getUsosDelAsistente: LectorDeUsosDelAsistente = cache(async () => {
  await connection()
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('asistente_ia_usos_del_mes')
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return usosDelMes(data)
})
