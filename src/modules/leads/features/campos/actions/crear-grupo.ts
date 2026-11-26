'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { puede, type Permisos } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeGruposDeCampos } from '../../../composicion'
import { MOTIVO_SIN_PERMISO_CAMPOS } from '../../../entities/motivos'
import { esquemaCrearGrupoDeCampos } from '../schemas/grupos'

async function crear(permisos: Permisos, nombre: string) {
  if (!puede(permisos, 'leads.campos.gestionar')) {
    return fallo('sin_permiso', MOTIVO_SIN_PERMISO_CAMPOS)
  }
  return repositorioDeGruposDeCampos.crear(nombre)
}

// «Crear grupo «x»» del combo del panel de un campo: crea el grupo al final del catálogo y lo devuelve para elegirlo. Se llama con el
// formulario del campo a medio llenar: no revalida (redibujar la página lo perdería); guardar el campo trae la lista nueva.
export const crearGrupoDeCampos = actionClient
  .inputSchema(esquemaCrearGrupoDeCampos)
  .action(({ parsedInput, ctx }) => crear(ctx.permisos, parsedInput.nombre))

// «Agregar» del drawer «Grupos»: lo mismo, y revalida (el formulario del drawer se vacía al terminar; no hay nada a medio tipear).
export const agregarGrupoDeCampos = actionClient
  .inputSchema(esquemaCrearGrupoDeCampos)
  .action(async ({ parsedInput, ctx }) => {
    const hecho = await crear(ctx.permisos, parsedInput.nombre)
    if (hecho.ok) {
      revalidatePath(RUTAS.configuracionDeLeads, 'layout')
    }
    return hecho
  })
