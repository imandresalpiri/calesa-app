'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeGruposDelOrigen } from '../../../composicion'
import { MOTIVO_SIN_PERMISO_ORIGENES } from '../../../entities/motivos'
import { esquemaGuardarGrupoDelOrigen } from '../schemas/grupos'

// Drawer «Grupos» del origen: renombrar, activar o desactivar un grupo del origen (renombrar cambia el nombre en todos sus campos: es una referencia). Revalida: el drawer no tiene nada a medio tipear.
export const guardarGrupoDelOrigen = actionClient
  .inputSchema(esquemaGuardarGrupoDelOrigen)
  .action(async ({ parsedInput, ctx }) => {
    if (!puede(ctx.permisos, 'origenes.gestionar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_ORIGENES)
    }
    const hecho = await repositorioDeGruposDelOrigen.guardar(parsedInput)
    if (hecho.ok) {
      revalidatePath(RUTAS.origenes, 'layout')
    }
    return hecho
  })
