'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeCategorias } from '../../../areas/dinero/composicion'
import type { CatalogoGuardado } from '../../../entities/nucleo/catalogos'
import { SIN_PERMISO_PARA_LAS_CATEGORIAS } from '../../../entities/dinero/categoria'
import { esquemaGuardarCategoria } from '../schemas/categoria'

// Corrige una categoría de gasto con sólo lo que cambió y la versión que se vio, o la activa o desactiva (6.11-4). Pide `logistica.catalogos.gestionar` en algún
// origen; la base mira el origen de la propia o todos los que usan la compartida.
export const guardarCategoria = actionClient
  .inputSchema(esquemaGuardarCategoria)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<CatalogoGuardado>> => {
    if (!puede(ctx.permisos, 'logistica.catalogos.gestionar')) {
      return fallo('sin_permiso', SIN_PERMISO_PARA_LAS_CATEGORIAS)
    }
    return repositorioDeCategorias.guardar(parsedInput)
  })
