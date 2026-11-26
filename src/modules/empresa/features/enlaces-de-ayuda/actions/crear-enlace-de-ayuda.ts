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
import { esquemaCrearEnlaceDeAyuda } from '../schemas/enlaces-de-ayuda'

// Crea uno al final de la lista, con el id del intento: repetirlo no crea otro.
export const crearEnlaceDeAyuda = actionClient
  .inputSchema(esquemaCrearEnlaceDeAyuda)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<ListaDeEnlacesDeLaEmpresa>> => {
    if (!puede(ctx.permisos, 'empresa.ajustes.gestionar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_AJUSTES)
    }
    const hecho = comoResultado(await repositorioDeEnlacesDeAyuda.crear(parsedInput))
    if (hecho.ok) {
      // La tarjeta de Empresa y la de Perfil los muestran; el menú los lee al abrirse.
      revalidatePath(RUTAS.empresa)
      revalidatePath(RUTAS.perfil)
    }
    return hecho
  })
