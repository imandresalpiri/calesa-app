'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeGruposDelOrigen } from '../../../composicion'
import { MOTIVO_SIN_PERMISO_ORIGENES } from '../../../entities/motivos'
import { esquemaMoverGrupoDelOrigen } from '../schemas/grupos'

// Drawer «Grupos» del origen: subir o bajar un grupo del origen: el orden de los bloques del formulario y de la ficha del vehículo. Revalida: el drawer no tiene nada a medio tipear.
export const moverGrupoDelOrigen = actionClient
  .inputSchema(esquemaMoverGrupoDelOrigen)
  .action(async ({ parsedInput, ctx }) => {
    if (!puede(ctx.permisos, 'origenes.gestionar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_ORIGENES)
    }
    const hecho = await repositorioDeGruposDelOrigen.mover(parsedInput)
    if (hecho.ok) {
      revalidatePath(RUTAS.origenes, 'layout')
    }
    return hecho
  })
