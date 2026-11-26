// Los vehículos de un grupo de transporte desde el navegador, con la sesión de quien mira: `transporte_grupo()` (definer; exige `logistica.ver` o `repuestos.ver` y lista sólo las unidades
// que quien mira ve, hasta 200, con `hay_mas`). Una llamada: por `embarques_booking_origen_key` / `contenedores_numero_origen_key` y las unidades por `transportes_embarque_idx` y
// `transportes_contenedor_id_idx`, nunca la tabla. La usan el lote, los documentos y el dinero de un grupo (un área no importa otra).
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/browser'
import {
  vehiculosDelGrupoDesde,
  type VehiculosDelGrupo,
} from '../../entities/nucleo/unidades-del-grupo'

export const NO_SE_LEYERON_LOS_VEHICULOS_DEL_GRUPO = 'No pudimos leer las unidades del grupo.'

export type ClaveDelGrupo = { tipo: 'booking' | 'contenedor'; clave: string }

export async function leerVehiculosDelGrupo({
  tipo,
  clave,
}: ClaveDelGrupo): Promise<Resultado<VehiculosDelGrupo>> {
  const { data, error } = await createClient().rpc('transporte_grupo', {
    p_tipo: tipo,
    p_clave: clave,
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const leido = vehiculosDelGrupoDesde(data)
  return leido ? ok(leido) : fallo('inesperado', NO_SE_LEYERON_LOS_VEHICULOS_DEL_GRUPO)
}
