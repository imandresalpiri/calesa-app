'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioIntegraciones } from '../../../composicion'
import { MOTIVO_SIN_PERMISO_AJUSTES } from '../../../entities/motivos'
import { esquemaGuardarAsistente } from '../schemas/asistente'

// Prender o apagar el asistente de IA, o cambiar su proveedor (preajuste, dirección y modelo). La base no lo enciende sin clave y, si la
// dirección cambia de origen con una clave guardada, la borra y lo apaga: la clave no viaja a un servidor que nadie le cargó.
export const guardarAsistente = actionClient
  .inputSchema(esquemaGuardarAsistente)
  .action(async ({ parsedInput, ctx }) => {
    if (!puede(ctx.permisos, 'empresa.ajustes.gestionar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_AJUSTES)
    }
    const { actualizadoEnEsperado, activa, preajuste, urlBase, modelo } = parsedInput
    const guardada = await repositorioIntegraciones.guardar({
      clave: 'asistente_ia',
      actualizadoEnEsperado,
      activa,
      // El resto de la configuración (el prompt base, los atajos, los últimos 4 de la clave) lo conserva la base.
      config: preajuste === undefined ? undefined : { preajuste, url_base: urlBase, modelo },
    })
    if (guardada.ok) {
      revalidatePath(RUTAS.integracionesDeEmpresa)
    }
    return guardada
  })
