'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeEnlacesDeAyuda } from '../../../composicion'
import type { ListaDeEnlacesDeLaEmpresa } from '../../../entities/enlaces-de-ayuda'
import { MOTIVO_SIN_PERMISO_AJUSTES } from '../../../entities/motivos'
import { comoResultado } from './resultado'
import { esquemaQuitarEnlaceDeAyuda } from '../schemas/enlaces-de-ayuda'

// Lo borra; también de la lista de cada persona. Uno que ya no estaba no es un error.
export const quitarEnlaceDeAyuda = actionClient
  .inputSchema(esquemaQuitarEnlaceDeAyuda)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<ListaDeEnlacesDeLaEmpresa>> => {
    if (!puede(ctx.permisos, 'empresa.ajustes.gestionar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_AJUSTES)
    }
    const hecho = comoResultado(await repositorioDeEnlacesDeAyuda.quitar(parsedInput))
    if (hecho.ok) {
      // La tarjeta de Empresa y la de Perfil los muestran; el menú los lee al abrirse.
      revalidatePath(RUTAS.empresa)
      revalidatePath(RUTAS.perfil)
    }
    return hecho
  })
