'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeCategorias } from '../../../areas/dinero/composicion'
import { SIN_PERMISO_PARA_LAS_CATEGORIAS } from '../../../entities/dinero/categoria'
import { esquemaEliminarCategoria } from '../schemas/categoria'

// Elimina una categoría de gasto con la versión que se vio (6.11-4). Una con gastos no se borra: la base responde 23503 (««X» tiene gastos: desactívala.»).
// Pide `logistica.catalogos.gestionar` en algún origen; la base mira el de la propia o todos los que la usan.
export const eliminarCategoria = actionClient
  .inputSchema(esquemaEliminarCategoria)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<{ id: string }>> => {
    if (!puede(ctx.permisos, 'logistica.catalogos.gestionar')) {
      return fallo('sin_permiso', SIN_PERMISO_PARA_LAS_CATEGORIAS)
    }
    return repositorioDeCategorias.eliminar(parsedInput)
  })
