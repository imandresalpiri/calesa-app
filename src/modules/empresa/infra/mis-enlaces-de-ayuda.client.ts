// Los enlaces de ayuda de quien mira, leídos desde el navegador al abrir «Ayuda» del menú del perfil (nunca en el layout): una sola RPC
// con los permisos de quien llama (`enlaces_de_ayuda_de_mi()`).
import { errorDePostgrest, fallo, MENSAJE_INESPERADO, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/browser'
import { misEnlacesDesde } from '../entities/mis-enlaces-de-ayuda'
import type { LectorDeMisEnlacesDeAyuda } from '../entities/repositorios'

export const leerMisEnlacesDeAyuda: LectorDeMisEnlacesDeAyuda = async () => {
  const { data, error } = await createClient().rpc('enlaces_de_ayuda_de_mi')
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const leidos = misEnlacesDesde(data)
  return leidos ? ok(leidos) : fallo('inesperado', MENSAJE_INESPERADO)
}
