'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeGruposDelOrigen } from '../../../composicion'
import { MOTIVO_SIN_PERMISO_ORIGENES } from '../../../entities/motivos'
import { esquemaQuitarGrupoDelOrigen } from '../schemas/grupos'

// Drawer «Grupos» del origen: quitar un grupo del origen sin campos, o con «Mover sus N campos a…», que los mueve antes en la misma RPC. Revalida: el drawer no tiene nada a medio tipear.
export const quitarGrupoDelOrigen = actionClient
  .inputSchema(esquemaQuitarGrupoDelOrigen)
  .action(async ({ parsedInput, ctx }) => {
    if (!puede(ctx.permisos, 'origenes.gestionar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_ORIGENES)
    }
    const hecho = await repositorioDeGruposDelOrigen.quitar(parsedInput)
    if (hecho.ok) {
      revalidatePath(RUTAS.origenes, 'layout')
    }
    return hecho
  })
