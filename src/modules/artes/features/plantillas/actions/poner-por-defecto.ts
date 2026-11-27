'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { ponerPorDefecto as ponerEnLaBase } from '../../../composicion'
import { MOTIVO_SIN_COTIZACIONES_DEL_ORIGEN } from '../../../entities/permisos-de-artes'
import { esquemaPonerPorDefecto } from '../schemas/plantillas'

// Elige (o quita, con `plantillaId` nulo) la plantilla por defecto de quien mira para imagen o para PDF en un origen. Es de cada persona.
export const ponerPorDefecto = actionClient
  .inputSchema(esquemaPonerPorDefecto)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<{ hecho: true }>> => {
    if (!puede(ctx.permisos, 'cotizaciones.ver', parsedInput.origenId)) {
      return fallo('sin_permiso', MOTIVO_SIN_COTIZACIONES_DEL_ORIGEN)
    }
    const hecho = await ponerEnLaBase(parsedInput)
    if (!hecho.ok) {
      return hecho
    }
    revalidatePath(RUTAS.artes)
    return { ok: true, data: { hecho: true } }
  })
