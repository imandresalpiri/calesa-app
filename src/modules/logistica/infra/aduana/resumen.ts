import 'server-only'
import { diaEnZona } from '@/shared/lib/fechas'
import { createClient } from '@/shared/lib/supabase/server'
import { declaracionDesde, esCanalDeAforo } from '../../entities/aduana/declaracion'
import {
  pideSaberSiEstaPagada,
  resumenDeAduana,
  type DeclaracionDelResumen,
} from '../../entities/aduana/resumen'
import { resumenQueNoSeLeyo, type ResumenDeTarjeta } from '../../entities/nucleo/tarjeta'

// El resumen de la tarjeta «Aduana»: el vínculo vivo de la unidad con su declaración (por el índice por vehículo de `declaraciones_vehiculos`, `limit 1`: una unidad está en una sola
// viva) y, sólo si los tributos vencen en 7 días o ya vencieron, `declaracion_leer` para saber si está pagada (si no, no hace falta: no avisaría). Un fallo de la segunda lectura avisa
// igual (se trata como no pagada); uno de la primera dice «No pudimos leer el resumen.».
async function leerSiEstaPagada(declaracionId: string): Promise<boolean | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('declaracion_leer', { p_id: declaracionId })
  return error ? null : (declaracionDesde(data)?.pagada ?? null)
}

export async function leerResumenDeAduana(
  vehiculoId: string,
  origenId: string,
): Promise<ResumenDeTarjeta> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('declaraciones_vehiculos')
    .select('declaraciones_aduana(id, numero, canal, vence_tributos_el)')
    .eq('vehiculo_id', vehiculoId)
    .is('removido_en', null)
    .limit(1)
  if (error) return resumenQueNoSeLeyo('aduana')
  const cabecera = data[0]?.declaraciones_aduana ?? null
  const declaracion: DeclaracionDelResumen | null = cabecera && {
    id: cabecera.id,
    numero: cabecera.numero,
    canal: esCanalDeAforo(cabecera.canal) ? cabecera.canal : null,
    venceTributosEl: cabecera.vence_tributos_el,
  }
  const hoy = diaEnZona(new Date().toISOString())
  const pagada =
    declaracion && pideSaberSiEstaPagada(declaracion.venceTributosEl, hoy)
      ? await leerSiEstaPagada(declaracion.id)
      : null
  return resumenDeAduana({ declaracion, pagada, hoy, origenId })
}
