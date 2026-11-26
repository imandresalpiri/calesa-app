'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeGruposDeCampos } from '../../../composicion'
import { MOTIVO_SIN_PERMISO_CAMPOS } from '../../../entities/motivos'
import { esquemaQuitarGrupoDeCampos } from '../schemas/grupos'

// Drawer «Grupos»: quitar un grupo sin campos, o con «Mover sus N campos a…», que los mueve antes en la misma RPC. Revalida: el drawer no tiene nada a medio tipear.
export const quitarGrupoDeCampos = actionClient
  .inputSchema(esquemaQuitarGrupoDeCampos)
  .action(async ({ parsedInput, ctx }) => {
    if (!puede(ctx.permisos, 'leads.campos.gestionar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_CAMPOS)
    }
    const hecho = await repositorioDeGruposDeCampos.quitar(parsedInput)
    if (hecho.ok) {
      revalidatePath(RUTAS.configuracionDeLeads, 'layout')
    }
    return hecho
  })
