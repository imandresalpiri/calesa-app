'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioIntegraciones } from '../../../composicion'
import { MOTIVO_SIN_PERMISO_AJUSTES } from '../../../entities/motivos'
import { esquemaGuardarIndicaciones } from '../schemas/asistente'

// El prompt base y los atajos del asistente, juntos y con la versión de la fila: la lista entera reemplaza a la guardada, en su orden.
export const guardarIndicacionesDelAsistente = actionClient
  .inputSchema(esquemaGuardarIndicaciones)
  .action(async ({ parsedInput, ctx }) => {
    if (!puede(ctx.permisos, 'empresa.ajustes.gestionar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_AJUSTES)
    }
    const { actualizadoEnEsperado, promptBase, atajos } = parsedInput
    const guardadas = await repositorioIntegraciones.guardar({
      clave: 'asistente_ia',
      actualizadoEnEsperado,
      config: {
        prompt_base: promptBase,
        atajos: atajos.map(({ id, nombre, instruccion, activo, maxTokens }) => ({
          id,
          nombre,
          instruccion,
          activo,
          max_tokens: maxTokens,
        })),
      },
    })
    if (guardadas.ok) {
      revalidatePath(RUTAS.integracionesDeEmpresa)
    }
    return guardadas
  })
