'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { eliminarPlantilla } from '../../../composicion'
import { esquemaEliminarPlantillaDeArte } from '../schemas/plantillas'

// Elimina una plantilla de arte (su autor si es privada; quien gestiona las de la empresa si es de la empresa: lo decide la RPC) con la
// versión que se tenía en pantalla. Las imágenes que usaba no se tocan; la miniatura queda sin referencias y la barre la cola de Storage.
export const eliminarPlantillaDeArte = actionClient
  .inputSchema(esquemaEliminarPlantillaDeArte)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<{ id: string }>> => {
    const hecho = await eliminarPlantilla(parsedInput)
    if (hecho.ok) {
      revalidatePath(RUTAS.artes)
    }
    return hecho
  })
