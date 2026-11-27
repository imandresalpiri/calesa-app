import 'server-only'
import { createClient } from '@/shared/lib/supabase/server'
import { resumenDeDinero, TOPE_DEL_RESUMEN_DE_DINERO } from '../../entities/dinero/resumen'
import { resumenQueNoSeLeyo, type ResumenDeTarjeta } from '../../entities/nucleo/tarjeta'

// El resumen de la tarjeta «Dinero», con la sesión de quien mira (las policies `gastos: leer` y `pagos: leer`): sólo lee lo de los huecos que se ven. Gastos por
// `gastos_vehiculo_idx` y pagos por `pagos_vehiculo_idx` (los dos parciales sin los eliminados), cada uno con `limit tope + 1` y en paralelo. El margen no se lee.
async function contarGastos(vehiculoId: string): Promise<number | null | undefined> {
  const { data, error } = await (
    await createClient()
  )
    .from('gastos')
    .select('id')
    .eq('vehiculo_id', vehiculoId)
    .is('eliminado_en', null)
    .limit(TOPE_DEL_RESUMEN_DE_DINERO + 1)
  return error ? undefined : data.length
}

async function leerConfirmados(vehiculoId: string): Promise<boolean[] | undefined> {
  const { data, error } = await (
    await createClient()
  )
    .from('pagos')
    .select('confirmado')
    .eq('vehiculo_id', vehiculoId)
    .is('eliminado_en', null)
    .limit(TOPE_DEL_RESUMEN_DE_DINERO + 1)
  return error ? undefined : data.map((p) => p.confirmado)
}

export async function leerResumenDeDinero(
  vehiculoId: string,
  pedido: {
    verGastos: boolean
    verPagos: boolean
    puedeRegistrarGasto: boolean
    puedeRegistrarPago: boolean
  },
): Promise<ResumenDeTarjeta> {
  const [gastos, pagos] = await Promise.all([
    pedido.verGastos ? contarGastos(vehiculoId) : null,
    pedido.verPagos ? leerConfirmados(vehiculoId) : null,
  ])
  if (gastos === undefined || pagos === undefined) return resumenQueNoSeLeyo('dinero')
  return resumenDeDinero({
    gastos,
    pagos,
    puedeRegistrarGasto: pedido.puedeRegistrarGasto,
    puedeRegistrarPago: pedido.puedeRegistrarPago,
  })
}
