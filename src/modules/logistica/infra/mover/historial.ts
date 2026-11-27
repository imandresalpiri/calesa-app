import 'server-only'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import type { PasadaLeida } from '../../entities/mover/cadena'
import { COLUMNAS_DE_PASADA, pasadasDesde, TOPE_DE_PASADAS } from '../../entities/mover/pasadas'

export const NO_SE_LEYERON_LAS_PASADAS = 'No pudimos leer las fases pasadas.'

// Las pasadas de la cadena de la unidad, en el servidor y con la sesión de quien mira (la policy de `historial_fases` pide `logistica.ver` en la unidad): por
// `historial_fases_vehiculo_idx (vehiculo_id, creado_en)` caminado hacia atrás, `TOPE_DE_PASADAS` + 1 filas, con la fase y la persona embebidas por su PK. Una lectura por
// vista de la página; la tarjeta «Historial» resume la primera sin otra consulta.
export async function leerPasadasDeLaUnidad(
  vehiculoId: string,
): Promise<Resultado<{ pasadas: PasadaLeida[]; hayMas: boolean }>> {
  const { data, error } = await (
    await createClient()
  )
    .from('historial_fases')
    .select(COLUMNAS_DE_PASADA)
    .eq('vehiculo_id', vehiculoId)
    .order('creado_en', { ascending: false })
    .order('id', { ascending: false })
    .limit(TOPE_DE_PASADAS + 1)
  if (error) return { ok: false, error: errorDePostgrest(error) }
  const leidas = pasadasDesde(data)
  return leidas === null ? fallo('inesperado', NO_SE_LEYERON_LAS_PASADAS) : ok(leidas)
}
