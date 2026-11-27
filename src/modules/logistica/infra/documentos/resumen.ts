import 'server-only'
import { diaEnZona } from '@/shared/lib/fechas'
import { createClient } from '@/shared/lib/supabase/server'
import {
  COLUMNAS_DEL_RESUMEN_DE_DOCUMENTOS,
  documentosDelResumenDesde,
  resumenDeDocumentos,
  TOPE_DEL_RESUMEN_DE_DOCUMENTOS,
} from '../../entities/documentos/resumen'
import { resumenQueNoSeLeyo, type ResumenDeTarjeta } from '../../entities/nucleo/tarjeta'

// El resumen de la tarjeta «Documentos», con la sesión de quien mira (la policy «documentos: leer»). Por `documentos_vehiculo_id_idx`, vivos, con `limit tope + 1`: ordena a lo sumo
// esas filas, las de una unidad. Un fallo no tumba la página: la tarjeta dice «No pudimos leer el resumen.» y se abre igual.
export async function leerResumenDeDocumentos(
  vehiculoId: string,
  { puedeSubir }: { puedeSubir: boolean },
): Promise<ResumenDeTarjeta> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('documentos')
    .select(COLUMNAS_DEL_RESUMEN_DE_DOCUMENTOS)
    .eq('vehiculo_id', vehiculoId)
    .is('eliminado_en', null)
    .order('creado_en', { ascending: false })
    .order('id', { ascending: false })
    .limit(TOPE_DEL_RESUMEN_DE_DOCUMENTOS + 1)
  const leidos = error ? null : documentosDelResumenDesde(data)
  if (leidos === null) return resumenQueNoSeLeyo('documentos')
  return resumenDeDocumentos({ leidos, hoy: diaEnZona(new Date().toISOString()), puedeSubir })
}
