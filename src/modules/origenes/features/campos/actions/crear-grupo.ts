'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { puede, type Permisos } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeGruposDelOrigen } from '../../../composicion'
import { MOTIVO_SIN_PERMISO_ORIGENES } from '../../../entities/motivos'
import { esquemaCrearGrupoDelOrigen } from '../schemas/grupos'

async function crear(permisos: Permisos, origenId: string, nombre: string) {
  if (!puede(permisos, 'origenes.gestionar')) {
    return fallo('sin_permiso', MOTIVO_SIN_PERMISO_ORIGENES)
  }
  return repositorioDeGruposDelOrigen.crear(origenId, nombre)
}

// «Crear grupo «x»» del combo del panel de un campo del origen: crea el grupo al final del catálogo del origen y lo devuelve para elegirlo.
// Se llama con el formulario del campo a medio llenar: no revalida (redibujar la página lo perdería); guardar el campo trae la lista nueva.
export const crearGrupoDelOrigen = actionClient
  .inputSchema(esquemaCrearGrupoDelOrigen)
  .action(({ parsedInput, ctx }) => crear(ctx.permisos, parsedInput.origenId, parsedInput.nombre))

// «Agregar» del drawer «Grupos» del origen: lo mismo, y revalida (el formulario del drawer se vacía al terminar; no hay nada a medio tipear).
export const agregarGrupoDelOrigen = actionClient
  .inputSchema(esquemaCrearGrupoDelOrigen)
  .action(async ({ parsedInput, ctx }) => {
    const hecho = await crear(ctx.permisos, parsedInput.origenId, parsedInput.nombre)
    if (hecho.ok) {
      revalidatePath(RUTAS.origenes, 'layout')
    }
    return hecho
  })
