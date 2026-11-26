'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeCategorias } from '../../../areas/dinero/composicion'
import type { CatalogoCreado } from '../../../entities/nucleo/catalogos'
import { SIN_PERMISO_PARA_LAS_CATEGORIAS } from '../../../entities/dinero/categoria'
import { esquemaCrearCategoria } from '../schemas/categoria'

// Crea una categoría de gasto propia de un origen o compartida con todos (`origenId` nulo), con el id del intento (6.11-4). Pide `logistica.catalogos.gestionar` en ese
// origen (si es compartida, en alguno) y la base lo vuelve a mirar.
export const crearCategoria = actionClient
  .inputSchema(esquemaCrearCategoria)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<CatalogoCreado>> => {
    if (!puede(ctx.permisos, 'logistica.catalogos.gestionar', parsedInput.origenId ?? undefined)) {
      return fallo('sin_permiso', SIN_PERMISO_PARA_LAS_CATEGORIAS)
    }
    return repositorioDeCategorias.crear(parsedInput)
  })
