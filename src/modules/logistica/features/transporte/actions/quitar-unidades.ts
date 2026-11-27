'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeEmbarques } from '../../../areas/transporte/composicion'
import type { LoteAplicado } from '../../../entities/transporte/repositorio-de-embarques'
import { esquemaQuitarUnidades } from '../schemas/asignacion'
import { revalidarLosEmbarques, SIN_PERMISO_PARA_LOS_EMBARQUES } from '../revalidar-los-embarques'

// Saca vehículos de su contenedor (quedan directos en su embarque) o de su embarque, todo o nada. Pide `logistica.transporte.editar` en el origen y la base lo vuelve a mirar.
export const quitarUnidades = actionClient
  .inputSchema(esquemaQuitarUnidades)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<LoteAplicado>> => {
    if (!puede(ctx.permisos, 'logistica.transporte.editar', parsedInput.origenId)) {
      return fallo('sin_permiso', SIN_PERMISO_PARA_LOS_EMBARQUES)
    }
    const r = await repositorioDeEmbarques.quitar(parsedInput)
    if (r.ok) {
      revalidarLosEmbarques()
    }
    return r
  })
