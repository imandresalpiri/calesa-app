'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { renombrarImagen, type ConVersion } from '../../../composicion'
import { esquemaRenombrarImagenDeArte } from '../schemas/imagenes'

// Cambia el nombre de una imagen de la biblioteca con la versión que se tenía en pantalla. La personal, su dueño; la de la empresa, quien la
// gestiona: lo decide la RPC (42501), que sabe de quién es.
export const renombrarImagenDeArte = actionClient
  .inputSchema(esquemaRenombrarImagenDeArte)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<ConVersion>> => {
    const hecho = await renombrarImagen(parsedInput)
    if (hecho.ok) {
      revalidatePath(RUTAS.artes)
    }
    return hecho
  })
