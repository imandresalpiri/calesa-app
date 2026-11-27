'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDelLive } from '../../../composicion'
import { MOTIVO_SIN_PERMISO_DEL_LIVE } from '../../../entities/live-configuracion'
import { esquemaGuardarPersonaDelLive } from '../schemas/live'

// Guarda lo propio de una persona (sólo lo que pisa a su rol; vacío quita la fila) con la versión que se tenía en pantalla.
export const guardarPersonaDelLive = actionClient
  .inputSchema(esquemaGuardarPersonaDelLive)
  .action(async ({ parsedInput, ctx }) => {
    if (!puede(ctx.permisos, 'live.configurar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_DEL_LIVE)
    }
    const hecho = await repositorioDelLive.guardarPersona(parsedInput)
    if (hecho.ok) {
      revalidatePath(RUTAS.modoLive)
    }
    return hecho
  })
