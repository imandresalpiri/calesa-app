'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeLogos } from '../../../composicion'
import { MOTIVO_SIN_PERMISO_AJUSTES } from '../../../entities/motivos'
import type { RespuestaDeLogos } from '../../../entities/repositorios'
import {
  esquemaCrearLogo,
  esquemaOrdenarLogos,
  esquemaQuitarLogo,
  esquemaRenombrarLogo,
} from '../schemas/logos'
import { comoResultado } from './resultado'

type Resultado = ResultadoDeAccion<RespuestaDeLogos>

// Las variantes del logo las escribe la RPC con `empresa.ajustes.gestionar` (la base lo repite); el permiso se comprueba antes para dar el motivo
// sin ir a la base. Tras escribir, la tarjeta de Empresa se revalida (y la ventana de cámara del Live lee de nuevo al recargar).
function revalidar(hecho: Resultado): Resultado {
  if (hecho.ok) {
    revalidatePath(RUTAS.empresa)
  }
  return hecho
}

// Suma una al final de la lista, con el id del intento: repetirlo no suma otra. El archivo ya está subido al bucket.
export const crearLogo = actionClient
  .inputSchema(esquemaCrearLogo)
  .action(async ({ parsedInput, ctx }): Promise<Resultado> => {
    if (!puede(ctx.permisos, 'empresa.ajustes.gestionar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_AJUSTES)
    }
    return revalidar(comoResultado(await repositorioDeLogos.crear(parsedInput)))
  })

export const renombrarLogo = actionClient
  .inputSchema(esquemaRenombrarLogo)
  .action(async ({ parsedInput, ctx }): Promise<Resultado> => {
    if (!puede(ctx.permisos, 'empresa.ajustes.gestionar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_AJUSTES)
    }
    return revalidar(comoResultado(await repositorioDeLogos.renombrar(parsedInput)))
  })

export const ordenarLogos = actionClient
  .inputSchema(esquemaOrdenarLogos)
  .action(async ({ parsedInput, ctx }): Promise<Resultado> => {
    if (!puede(ctx.permisos, 'empresa.ajustes.gestionar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_AJUSTES)
    }
    return revalidar(comoResultado(await repositorioDeLogos.ordenar(parsedInput)))
  })

export const quitarLogo = actionClient
  .inputSchema(esquemaQuitarLogo)
  .action(async ({ parsedInput, ctx }): Promise<Resultado> => {
    if (!puede(ctx.permisos, 'empresa.ajustes.gestionar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_AJUSTES)
    }
    return revalidar(comoResultado(await repositorioDeLogos.quitar(parsedInput)))
  })
