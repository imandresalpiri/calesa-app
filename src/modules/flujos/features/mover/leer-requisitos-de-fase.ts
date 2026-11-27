import 'server-only'
import type { Resultado } from '@/shared/lib/errores'
import { repositorioDeMover } from '../../areas/mover/composicion'
import type { UnidadAMover } from '../../entities/mover/unidad-a-mover'
import type { RequisitoVista } from '../../entities/mover/vista-previa'

export type PedidoDeRequisitosDeFase = { unidad: UnidadAMover; faseId: string }

// Lo que una fase cualquiera del flujo le pide a la unidad, aunque no sea una salida de la fase actual (la cadena de la unidad la mira «antes de llegar»). Es la misma
// vista previa que la de mover (`previsualizar_cambio_fase` evalúa los requisitos de toda fase del flujo): de ella sólo sirven los requisitos; si se puede mover ahí lo
// dice «Qué falta» con sus destinos, nunca esta lectura.
export async function leerRequisitosDeFase({
  unidad,
  faseId,
}: PedidoDeRequisitosDeFase): Promise<Resultado<{ requisitos: RequisitoVista[] }>> {
  const vista = await repositorioDeMover.previsualizar({ unidad, faseDestino: faseId })
  if (!vista.ok) return vista
  return { ok: true, data: { requisitos: vista.data.requisitos } }
}
