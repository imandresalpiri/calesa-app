// Lo que dibuja la imagen de la tarjeta de una cotización para quien la pide: lo que esa persona ve, como el PDF (el cliente sólo con
// `leads.ver`, o «Cliente» con el Modo Live que lo oculta; un error al leerlo, sin ese dato y sin que la imagen quede `completa`) y ella como
// asesor. Lo usan la ruta de la imagen (`/cotizaciones/<id>/imagen`) y el PDF de un arte, que dibuja la misma tarjeta.
import 'server-only'
import type { ContextoLeido } from '@/modules/cotizaciones'
import {
  asesorLeido,
  clienteDe,
  vehiculoDe,
  vehiculoDeLaTarjeta,
  type QuienNombraAlCliente,
} from './datos-de-la-tarjeta'

// Una lectura y si salió: un error deja el dato nulo.
const leida = <T>(lectura: Promise<T>) =>
  lectura.then(
    (valor) => ({ valor, ok: true }),
    () => ({ valor: null, ok: false }),
  )

export async function contextoDeQuienMira(
  quien: QuienNombraAlCliente,
  cotizacion: { leadId: string | null; vehiculoId: string | null },
): Promise<ContextoLeido> {
  const [cliente, vehiculo, asesor] = await Promise.all([
    leida(clienteDe(quien, cotizacion.leadId)),
    leida(vehiculoDe(cotizacion.vehiculoId)),
    asesorLeido(),
  ])
  return {
    contexto: {
      cliente: cliente.valor?.nombre ?? null,
      vehiculo: vehiculoDeLaTarjeta(vehiculo.valor),
      asesor: asesor.asesor,
    },
    completo: cliente.ok && vehiculo.ok && asesor.leido,
  }
}
