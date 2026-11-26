'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeCatalogosDeTransporte } from '../../../areas/transporte/composicion'
import type { CatalogoCreado } from '../../../entities/nucleo/catalogos'
import { SIN_PERMISO_PARA_LOS_CATALOGOS_DE_TRANSPORTE } from '../../../entities/transporte/catalogo'
import { esquemaCrearPuerto } from '../schemas/catalogo'

// Crea un puerto propio de un origen o compartido con todos (`origenId` nulo), con el id del intento (6.08-1). Pide `logistica.catalogos.gestionar` en ese
// origen (si es compartido, en alguno) y la base lo vuelve a mirar.
export const crearPuerto = actionClient
  .inputSchema(esquemaCrearPuerto)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<CatalogoCreado>> => {
    if (!puede(ctx.permisos, 'logistica.catalogos.gestionar', parsedInput.origenId ?? undefined)) {
      return fallo('sin_permiso', SIN_PERMISO_PARA_LOS_CATALOGOS_DE_TRANSPORTE)
    }
    return repositorioDeCatalogosDeTransporte.crearPuerto(parsedInput)
  })
