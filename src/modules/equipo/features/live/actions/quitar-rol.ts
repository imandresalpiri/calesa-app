'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDelLive } from '../../../composicion'
import { MOTIVO_SIN_PERMISO_DEL_LIVE } from '../../../entities/live-configuracion'
import { esquemaQuitarRolDelLive } from '../schemas/live'

// «Volver a lo por defecto»: quita la fila del rol, con su versión.
export const quitarRolDelLive = actionClient
  .inputSchema(esquemaQuitarRolDelLive)
  .action(async ({ parsedInput, ctx }) => {
    if (!puede(ctx.permisos, 'live.configurar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_DEL_LIVE)
    }
    const hecho = await repositorioDelLive.quitarRol(parsedInput)
    if (hecho.ok) {
      revalidatePath(RUTAS.modoLive)
    }
    return hecho
  })
