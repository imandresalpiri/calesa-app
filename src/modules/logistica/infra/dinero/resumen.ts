import 'server-only'
import { createClient } from '@/shared/lib/supabase/server'
import { margenDesde } from '../../entities/dinero/margen'
import { resumenDeDinero, TOPE_DEL_RESUMEN_DE_DINERO } from '../../entities/dinero/resumen'
import { resumenQueNoSeLeyo, type ResumenDeTarjeta } from '../../entities/nucleo/tarjeta'

// El resumen de la tarjeta «Dinero», con la sesión de quien mira (las policies `gastos: leer` y `pagos: leer`, y `margen_vehiculo`, que pide `logistica.margen.ver`): sólo
// lee lo de las vistas que se ven. Gastos por `gastos_vehiculo_idx` y pagos por `pagos_vehiculo_idx` (los dos parciales sin los eliminados), cada uno con `limit tope + 1`;
// el margen, una llamada que suma en la base por los mismos índices. Las tres en paralelo.
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

async function leerElMargen(vehiculoId: string): Promise<{ valor: number | null } | undefined> {
  const { data, error } = await (
    await createClient()
  ).rpc('margen_vehiculo', {
    p_vehiculo: vehiculoId,
  })
  const margen = error ? null : margenDesde(data)
  return margen === null ? undefined : { valor: margen.margen }
}

export async function leerResumenDeDinero(
  vehiculoId: string,
  pedido: {
    verGastos: boolean
    verPagos: boolean
    verMargen: boolean
    puedeRegistrarGasto: boolean
    puedeRegistrarPago: boolean
  },
): Promise<ResumenDeTarjeta> {
  const [gastos, pagos, margen] = await Promise.all([
    pedido.verGastos ? contarGastos(vehiculoId) : null,
    pedido.verPagos ? leerConfirmados(vehiculoId) : null,
    pedido.verMargen ? leerElMargen(vehiculoId) : null,
  ])
  if (gastos === undefined || pagos === undefined || margen === undefined) {
    return resumenQueNoSeLeyo('dinero')
  }
  return resumenDeDinero({
    gastos,
    pagos,
    margen,
    puedeRegistrarGasto: pedido.puedeRegistrarGasto,
    puedeRegistrarPago: pedido.puedeRegistrarPago,
  })
}
