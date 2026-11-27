'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeEmbarques } from '../../../areas/transporte/composicion'
import type { EntidadGuardada } from '../../../entities/transporte/repositorio-de-embarques'
import { esquemaGuardarContenedor } from '../schemas/contenedor'
import { revalidarLosEmbarques, SIN_PERMISO_PARA_LOS_EMBARQUES } from '../revalidar-los-embarques'

// Edita un contenedor con la versión que se leyó; `embarque_id` lo pasa a otro embarque o lo deja sin él. Pide `logistica.transporte.editar` en el origen y la base lo vuelve a mirar.
export const guardarContenedor = actionClient
  .inputSchema(esquemaGuardarContenedor)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<EntidadGuardada>> => {
    if (!puede(ctx.permisos, 'logistica.transporte.editar', parsedInput.origenId)) {
      return fallo('sin_permiso', SIN_PERMISO_PARA_LOS_EMBARQUES)
    }
    const r = await repositorioDeEmbarques.guardarContenedor(parsedInput)
    if (r.ok) {
      revalidarLosEmbarques()
    }
    return r
  })
