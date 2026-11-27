import 'server-only'
import { errorDePostgrest, fallo, type Resultado } from '@/shared/lib/errores'
import { TAMANO_DE_LA_BANDEJA, TOPE_DE_LA_BANDEJA } from '@/shared/lib/paginacion'
import { createClient } from '@/shared/lib/supabase/server'
import {
  grupoLeidoDesde,
  type CursorDeLaBandeja,
  type LecturaDelGrupo,
} from '../../entities/alertas/grupo-leido'
import type { GrupoDeLaBandeja } from '../../entities/alertas/grupos'

// Un grupo de la bandeja del día se lee con `logistica_bandeja_grupo()` y la sesión de quien mira: la base decide el alcance en el origen elegido y por permiso, recorre cada grupo por su índice y devuelve
// `tope` filas (más el conteo hasta `TOPE_DE_LA_BANDEJA` sólo en la primera página). La respuesta es `Json`: la entidad la valida.

export type PedidoDeUnGrupo = {
  grupo: GrupoDeLaBandeja
  // El origen elegido en Logística: la bandeja del día es de un origen.
  origenId: string
  // De a cuántas filas: la portada pide `PRIMERAS_DE_LA_BANDEJA`; la página del grupo, `TAMANO_DE_LA_BANDEJA`.
  tope: number
  // Con conteo (la primera página): «37» o «100+».
  conConteo: boolean
  cursor: CursorDeLaBandeja | null
}

const NO_SE_PUDO_CARGAR_EL_GRUPO = 'No se pudo cargar el grupo. Intenta de nuevo.'

export async function leerGrupoDeLaBase(
  pedido: PedidoDeUnGrupo,
): Promise<Resultado<LecturaDelGrupo>> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('logistica_bandeja_grupo', {
    p_grupo: pedido.grupo,
    p_origen: pedido.origenId,
    p_tope: Math.min(pedido.tope, TAMANO_DE_LA_BANDEJA),
    ...(pedido.conConteo && pedido.cursor === null ? { p_conteo: TOPE_DE_LA_BANDEJA } : {}),
    ...(pedido.cursor ? { p_desde: pedido.cursor.desde, p_id: pedido.cursor.id } : {}),
  })
  if (error) {
    // Un grupo o un cursor inválido no son algo que la persona pueda corregir: se dice que no cargó.
    return error.code === '22023'
      ? (fallo('regla', NO_SE_PUDO_CARGAR_EL_GRUPO) as Resultado<never>)
      : { ok: false, error: errorDePostgrest(error) }
  }
  return grupoLeidoDesde(pedido.grupo, data)
}
