'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDelLive } from '../../../composicion'
import { MOTIVO_SIN_PERMISO_DEL_LIVE } from '../../../entities/live-configuracion'
import { esquemaGuardarRolDelLive } from '../schemas/live'

// Guarda los ajustes del Live de un rol con la versión que se tenía en pantalla (nula: el rol estaba «Por defecto»). La base vuelve a exigir el
// permiso y valida los ajustes. Revalida la página: las tarjetas muestran lo guardado.
export const guardarRolDelLive = actionClient
  .inputSchema(esquemaGuardarRolDelLive)
  .action(async ({ parsedInput, ctx }) => {
    if (!puede(ctx.permisos, 'live.configurar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_DEL_LIVE)
    }
    const hecho = await repositorioDelLive.guardarRol(parsedInput)
    if (hecho.ok) {
      revalidatePath(RUTAS.modoLive)
    }
    return hecho
  })
