'use server'

import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { actionClient } from '@/shared/lib/safe-action'
import { probadorDelAsistente } from '../../../composicion'
import { MOTIVO_SIN_PERMISO_AJUSTES } from '../../../entities/motivos'

// «Probar conexión»: el servidor le manda al proveedor guardado un pedido mínimo con la clave y dice qué modelo respondió. No recibe nada
// del navegador, no cuenta como uso y no muta: sin `revalidatePath`.
export const probarAsistente = actionClient.action(async ({ ctx }) => {
  if (!puede(ctx.permisos, 'empresa.ajustes.gestionar')) {
    return fallo('sin_permiso', MOTIVO_SIN_PERMISO_AJUSTES)
  }
  return probadorDelAsistente()
})
