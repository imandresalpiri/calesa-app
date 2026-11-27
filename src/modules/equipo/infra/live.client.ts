import { errorDePostgrest, ok, type Resultado } from '@/shared/lib/errores'
import { TAMANO_DE_PERSONAS_DEL_LIVE } from '@/shared/lib/paginacion'
import { createClient } from '@/shared/lib/supabase/browser'
import {
  personasDelLiveDesde,
  type CursorDePersonasDelLive,
  type PaginaDePersonasDelLive,
} from '../entities/live-configuracion'

// «Ver más» de «Ajustes por persona», desde el navegador: la página siguiente de quienes tienen lo propio (`live_personas()` con el cursor de la
// última; el mismo índice que la primera página, que lee el servidor). La RPC vuelve a exigir `live.configurar`.
export async function leerMasPersonasDelLive(
  cursor: CursorDePersonasDelLive,
): Promise<Resultado<PaginaDePersonasDelLive>> {
  const { data, error } = await createClient().rpc('live_personas', {
    p_cursor_en: cursor.en,
    p_cursor_id: cursor.id,
    p_limite: TAMANO_DE_PERSONAS_DEL_LIVE + 1,
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(personasDelLiveDesde(data))
}
