'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeGruposDeCampos } from '../../../composicion'
import { MOTIVO_SIN_PERMISO_CAMPOS } from '../../../entities/motivos'
import { esquemaMoverGrupoDeCampos } from '../schemas/grupos'

// Drawer «Grupos»: subir o bajar un grupo: el orden de los bloques del formulario y de la ficha. Revalida: el drawer no tiene nada a medio tipear.
export const moverGrupoDeCampos = actionClient
  .inputSchema(esquemaMoverGrupoDeCampos)
  .action(async ({ parsedInput, ctx }) => {
    if (!puede(ctx.permisos, 'leads.campos.gestionar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_CAMPOS)
    }
    const hecho = await repositorioDeGruposDeCampos.mover(parsedInput)
    if (hecho.ok) {
      revalidatePath(RUTAS.configuracionDeLeads, 'layout')
    }
    return hecho
  })
