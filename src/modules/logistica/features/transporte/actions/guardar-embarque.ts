'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeEmbarques } from '../../../areas/transporte/composicion'
import type { EntidadGuardada } from '../../../entities/transporte/repositorio-de-embarques'
import { esquemaGuardarEmbarque } from '../schemas/embarque'
import { revalidarLosEmbarques, SIN_PERMISO_PARA_LOS_EMBARQUES } from '../revalidar-los-embarques'

// Edita un embarque con la versión que se leyó (`PT409` si cambió): naviera, puertos y fechas son suyos y valen para todos sus vehículos. Pide `logistica.transporte.editar` en el origen y la base lo vuelve a mirar.
export const guardarEmbarque = actionClient
  .inputSchema(esquemaGuardarEmbarque)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<EntidadGuardada>> => {
    if (!puede(ctx.permisos, 'logistica.transporte.editar', parsedInput.origenId)) {
      return fallo('sin_permiso', SIN_PERMISO_PARA_LOS_EMBARQUES)
    }
    const r = await repositorioDeEmbarques.guardarEmbarque(parsedInput)
    if (r.ok) {
      revalidarLosEmbarques()
    }
    return r
  })
