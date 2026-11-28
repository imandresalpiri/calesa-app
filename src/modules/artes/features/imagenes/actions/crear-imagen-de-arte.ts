'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { crearImagen, type Creada } from '../../../composicion'
import { MOTIVO_SIN_ARTES, MOTIVO_SIN_PERMISO_DE_ARTES } from '../../../entities/permisos-de-artes'
import { esquemaCrearImagenDeArte } from '../schemas/imagenes'

// Guarda en la biblioteca una imagen que el navegador ya subió al bucket `artes` (por su hash). Personal, de quien la sube; de la empresa, sólo
// con `artes.empresa.gestionar`. Con el id del intento: un reintento no crea dos.
export const crearImagenDeArte = actionClient
  .inputSchema(esquemaCrearImagenDeArte)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<Creada>> => {
    if (!puede(ctx.permisos, 'cotizaciones.ver')) {
      return fallo('sin_permiso', MOTIVO_SIN_ARTES)
    }
    if (parsedInput.ambito === 'empresa' && !puede(ctx.permisos, 'artes.empresa.gestionar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_DE_ARTES)
    }
    const hecho = await crearImagen(parsedInput)
    if (hecho.ok) {
      revalidatePath(RUTAS.artes)
    }
    return hecho
  })
