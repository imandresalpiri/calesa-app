'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeGruposDeCampos } from '../../../composicion'
import { MOTIVO_SIN_PERMISO_CAMPOS } from '../../../entities/motivos'
import { esquemaGuardarGrupoDeCampos } from '../schemas/grupos'

// Drawer «Grupos»: renombrar, activar o desactivar un grupo (renombrar cambia el nombre en todos sus campos: es una referencia). Revalida: el drawer no tiene nada a medio tipear.
export const guardarGrupoDeCampos = actionClient
  .inputSchema(esquemaGuardarGrupoDeCampos)
  .action(async ({ parsedInput, ctx }) => {
    if (!puede(ctx.permisos, 'leads.campos.gestionar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_CAMPOS)
    }
    const hecho = await repositorioDeGruposDeCampos.guardar(parsedInput)
    if (hecho.ok) {
      revalidatePath(RUTAS.configuracionDeLeads, 'layout')
    }
    return hecho
  })
