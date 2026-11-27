import 'server-only'
import { createClient } from '@/shared/lib/supabase/server'
import { resumenQueNoSeLeyo, type ResumenDeTarjeta } from '../../entities/nucleo/tarjeta'
import { lecturaDelTransporteDesde } from '../../entities/transporte/lectura-de-la-unidad'
import { resumenDeTransporte } from '../../entities/transporte/resumen'

// El resumen de la tarjeta «Transporte»: la misma `transporte_leer` del hueco (pide `logistica.ver` del vehículo; por `transportes_vehiculo_id_key` y las pkey de su embarque y
// su contenedor). Un fallo no tumba la página: la tarjeta lo dice y se abre igual.
export async function leerResumenDeTransporte(
  vehiculoId: string,
  origenId: string,
): Promise<ResumenDeTarjeta> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('transporte_leer', { p_vehiculo: vehiculoId })
  const lectura = error ? undefined : lecturaDelTransporteDesde(data)
  if (lectura === undefined) return resumenQueNoSeLeyo('transporte')
  return resumenDeTransporte(lectura, origenId)
}
