import 'server-only'
import { redactarConElAsistente, type PedidoAlAsistente } from '@/modules/empresa'
import { fallo, type Resultado } from '@/shared/lib/errores'
import { puede, type Permisos } from '@/shared/lib/permisos'
import { leerAsesorQueMira, leerCotizacionVisible } from '../../../../areas/tarjeta/composicion'

type Pedido =
  | { tipo: 'generar'; atajoId: string; texto: string }
  | { tipo: 'reescribir'; instruccion: string; texto: string }

// Lo común a generar y reescribir: primero, que quien pide vea la cotización (si no, ni se lee la clave); después, la firma con su nombre y si un
// error le ofrece ir a Integraciones (`empresa.ajustes.gestionar`). El asistente vuelve a comprobar la sesión y cuenta el uso.
export async function redactarSobreLaCotizacion(
  cotizacionId: string,
  pedido: Pedido,
  permisos: Permisos,
): Promise<Resultado<{ texto: string }>> {
  const visible = await leerCotizacionVisible(cotizacionId)
  if (!visible.ok) {
    return visible
  }
  if (!visible.data) {
    return fallo('sin_permiso', 'No tienes acceso a esta cotización.')
  }
  const asesor = await leerAsesorQueMira()
  const completo: PedidoAlAsistente = {
    ...pedido,
    firma: asesor.ok ? (asesor.data?.nombre ?? null) : null,
    puedeConfigurar: puede(permisos, 'empresa.ajustes.gestionar'),
  }
  return redactarConElAsistente(completo)
}
