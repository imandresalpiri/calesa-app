'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeEmbarques } from '../../../areas/transporte/composicion'
import type { LoteAplicado } from '../../../entities/transporte/repositorio-de-embarques'
import { revalidarLosEmbarques, SIN_PERMISO_PARA_LOS_EMBARQUES } from '../revalidar-los-embarques'
import { esquemaPonerElVehiculoEnTransporte } from '../schemas/asignacion'

// Pone un vehículo en un embarque o un contenedor (la de su hueco «Transporte»). Si es nuevo, primero lo crea con el id del intento: crear es idempotente por id, así que un
// reintento no duplica; si después falla la asignación, queda un embarque o un contenedor vacío, que es válido. Pide `logistica.transporte.editar` en el origen y la base lo
// vuelve a mirar.
export const ponerElVehiculoEnTransporte = actionClient
  .inputSchema(esquemaPonerElVehiculoEnTransporte)
  .action(async ({ parsedInput: p, ctx }): Promise<ResultadoDeAccion<LoteAplicado>> => {
    if (!puede(ctx.permisos, 'logistica.transporte.editar', p.origenId)) {
      return fallo('sin_permiso', SIN_PERMISO_PARA_LOS_EMBARQUES)
    }
    const { destino } = p
    if (destino.nuevo !== null) {
      const creado =
        destino.tipo === 'embarque'
          ? await repositorioDeEmbarques.crearEmbarque({
              id: destino.id,
              origenId: p.origenId,
              datos: destino.nuevo,
            })
          : await repositorioDeEmbarques.crearContenedor({
              id: destino.id,
              origenId: p.origenId,
              datos: destino.nuevo,
            })
      if (!creado.ok) {
        return creado
      }
    }
    const r = await repositorioDeEmbarques.asignar({
      tipo: destino.tipo,
      destinoId: destino.id,
      origenId: p.origenId,
      unidades: [{ vehiculoId: p.vehiculoId, actualizadoEn: p.actualizadoEn }],
      mover: p.mover,
    })
    if (r.ok || destino.nuevo !== null) {
      revalidarLosEmbarques()
    }
    return r
  })
