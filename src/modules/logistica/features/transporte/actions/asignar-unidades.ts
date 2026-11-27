'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeEmbarques } from '../../../areas/transporte/composicion'
import type { LoteAplicado } from '../../../entities/transporte/repositorio-de-embarques'
import { esquemaAsignarUnidades } from '../schemas/asignacion'
import { revalidarLosEmbarques, SIN_PERMISO_PARA_LOS_EMBARQUES } from '../revalidar-los-embarques'

// Suma hasta 200 vehículos a un embarque o a un contenedor, todo o nada, con la versión de cada transporte. Sin `mover`, uno que ya va en otro destino frena con `causa: 'mover'`. Pide `logistica.transporte.editar` en el origen y la base lo vuelve a mirar.
export const asignarUnidades = actionClient
  .inputSchema(esquemaAsignarUnidades)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<LoteAplicado>> => {
    if (!puede(ctx.permisos, 'logistica.transporte.editar', parsedInput.origenId)) {
      return fallo('sin_permiso', SIN_PERMISO_PARA_LOS_EMBARQUES)
    }
    const r = await repositorioDeEmbarques.asignar(parsedInput)
    if (r.ok) {
      revalidarLosEmbarques()
    }
    return r
  })
