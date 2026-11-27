// Los vehículos de un embarque o un contenedor desde el navegador, con la sesión de quien mira: `transporte_unidades()` (definer; exige `logistica.ver` o `repuestos.ver` y lista sólo las
// unidades que quien mira ve, hasta 200, con `hay_mas`). Una llamada: la entidad por su clave primaria y las unidades por `transportes_embarque_idx` y `transportes_contenedor_id_idx`,
// nunca la tabla. La usan el lote, los documentos y el dinero de un grupo (un área no importa otra).
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/browser'
import {
  vehiculosDelGrupoDesde,
  type VehiculosDelGrupo,
} from '../../entities/nucleo/unidades-del-grupo'

export const NO_SE_LEYERON_LOS_VEHICULOS_DEL_GRUPO = 'No pudimos leer las unidades del grupo.'

export type ClaveDelGrupo = { tipo: 'embarque' | 'contenedor'; id: string }

export async function leerVehiculosDelGrupo({
  tipo,
  id,
}: ClaveDelGrupo): Promise<Resultado<VehiculosDelGrupo>> {
  const { data, error } = await createClient().rpc('transporte_unidades', {
    p_tipo: tipo,
    p_id: id,
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const leido = vehiculosDelGrupoDesde(data)
  return leido ? ok(leido) : fallo('inesperado', NO_SE_LEYERON_LOS_VEHICULOS_DEL_GRUPO)
}
