'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeCatalogosDeTransporte } from '../../../areas/transporte/composicion'
import type { CatalogoGuardado } from '../../../entities/nucleo/catalogos'
import { SIN_PERMISO_PARA_LOS_CATALOGOS_DE_TRANSPORTE } from '../../../entities/transporte/catalogo'
import { esquemaGuardarPuerto } from '../schemas/catalogo'

// Corrige un puerto con sólo lo que cambió y la versión que se vio, o lo activa o desactiva (6.08-1). Pide `logistica.catalogos.gestionar` en algún
// origen; la base mira el origen del propio o todos los que usan el compartido.
export const guardarPuerto = actionClient
  .inputSchema(esquemaGuardarPuerto)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<CatalogoGuardado>> => {
    if (!puede(ctx.permisos, 'logistica.catalogos.gestionar')) {
      return fallo('sin_permiso', SIN_PERMISO_PARA_LOS_CATALOGOS_DE_TRANSPORTE)
    }
    return repositorioDeCatalogosDeTransporte.guardarPuerto(parsedInput)
  })
