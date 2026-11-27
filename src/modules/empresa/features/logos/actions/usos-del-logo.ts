'use server'

import { fallo } from '@/shared/lib/errores'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { puede } from '@/shared/lib/permisos'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeLogos } from '../../../composicion'
import { MOTIVO_SIN_PERMISO_AJUSTES } from '../../../entities/motivos'
import type { UsosDelLogo } from '../../../entities/logos'
import { esquemaUsosDelLogo } from '../schemas/logos'

// Dónde se usa una variante: lo que «Quitar» dice antes de confirmar.
export const usosDelLogo = actionClient
  .inputSchema(esquemaUsosDelLogo)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<UsosDelLogo>> => {
    if (!puede(ctx.permisos, 'empresa.ajustes.gestionar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_AJUSTES)
    }
    return repositorioDeLogos.usos(parsedInput)
  })
