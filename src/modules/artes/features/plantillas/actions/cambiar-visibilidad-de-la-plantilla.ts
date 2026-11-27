'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { cambiarVisibilidad, type ConVersion } from '../../../composicion'
import { MOTIVO_SIN_PERMISO_DE_ARTES } from '../../../entities/permisos-de-artes'
import { esquemaVisibilidadDeLaPlantilla } from '../schemas/plantillas'

// Hacerla de la empresa o privada: otorga o quita la vista a todo el equipo del origen, así que va por RPC y sólo con el permiso.
export const cambiarVisibilidadDeLaPlantilla = actionClient
  .inputSchema(esquemaVisibilidadDeLaPlantilla)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<ConVersion>> => {
    if (!puede(ctx.permisos, 'artes.empresa.gestionar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_DE_ARTES)
    }
    const hecho = await cambiarVisibilidad(parsedInput)
    if (hecho.ok) {
      revalidatePath(RUTAS.artes)
    }
    return hecho
  })
