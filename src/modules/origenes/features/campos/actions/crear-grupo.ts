'use server'

import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeGruposDelOrigen } from '../../../composicion'
import { MOTIVO_SIN_PERMISO_ORIGENES } from '../../../entities/motivos'
import { esquemaCrearGrupoDelOrigen } from '../schemas/grupos'

// «Crear grupo «x»» del combo del panel de un campo del origen: crea el grupo al final del catálogo del origen y lo devuelve para elegirlo.
// Se llama con el formulario del campo a medio llenar: no revalida (redibujar la página lo perdería); guardar el campo trae la lista nueva.
export const crearGrupoDelOrigen = actionClient
  .inputSchema(esquemaCrearGrupoDelOrigen)
  .action(async ({ parsedInput, ctx }) => {
    if (!puede(ctx.permisos, 'origenes.gestionar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_ORIGENES)
    }
    return repositorioDeGruposDelOrigen.crear(parsedInput.origenId, parsedInput.nombre)
  })
