'use server'

import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeGruposDeCampos } from '../../../composicion'
import { MOTIVO_SIN_PERMISO_CAMPOS } from '../../../entities/motivos'
import { esquemaCrearGrupoDeCampos } from '../schemas/grupos'

// «Crear grupo «x»» del combo del panel de un campo: crea el grupo al final del catálogo y lo devuelve para elegirlo. Se llama con el
// formulario del campo a medio llenar: no revalida (redibujar la página lo perdería); guardar el campo trae la lista nueva.
export const crearGrupoDeCampos = actionClient
  .inputSchema(esquemaCrearGrupoDeCampos)
  .action(async ({ parsedInput, ctx }) => {
    if (!puede(ctx.permisos, 'leads.campos.gestionar')) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_CAMPOS)
    }
    return repositorioDeGruposDeCampos.crear(parsedInput.nombre)
  })
