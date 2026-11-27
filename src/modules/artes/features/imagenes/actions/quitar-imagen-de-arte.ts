'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { quitarImagen, type ImagenQuitada } from '../../../composicion'
import { esquemaQuitarImagenDeArte } from '../schemas/imagenes'

// Quita una imagen de la biblioteca si ninguna plantilla de arte la usa; si alguna la usa, no la toca y devuelve cuántas (`{ usos }`). Sus
// objetos quedan sin referencias y los barre la cola de Storage. El permiso, como al renombrar, lo decide la RPC.
export const quitarImagenDeArte = actionClient
  .inputSchema(esquemaQuitarImagenDeArte)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<ImagenQuitada>> => {
    const hecho = await quitarImagen(parsedInput)
    if (hecho.ok && 'quitada' in hecho.data) {
      revalidatePath(RUTAS.artes)
    }
    return hecho
  })
