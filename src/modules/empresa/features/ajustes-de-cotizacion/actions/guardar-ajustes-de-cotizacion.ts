'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioAjustesDeCotizacion } from '../../../composicion'
import { puedeCambiarAjustesDeCotizacion } from '../../../entities/ajustes-de-cotizacion'
import { MOTIVO_SIN_PERMISO_AJUSTES_DE_COTIZACION } from '../../../entities/motivos'
import { esquemaGuardarAjustesDeCotizacion } from '../schemas/ajustes-de-cotizacion'

// La vigencia de las cotizaciones. Cambiar la vigencia mueve también la de las cotizaciones ya guardadas (D1 la
// calcula al leer). La base vuelve a exigir el permiso, el rango y la versión.
export const guardarAjustesDeCotizacion = actionClient
  .inputSchema(esquemaGuardarAjustesDeCotizacion)
  .action(async ({ parsedInput, ctx }) => {
    if (!puedeCambiarAjustesDeCotizacion(ctx.permisos)) {
      return fallo('sin_permiso', MOTIVO_SIN_PERMISO_AJUSTES_DE_COTIZACION)
    }
    const guardado = await repositorioAjustesDeCotizacion.guardar({
      vigenciaDias: parsedInput.vigenciaDias,
      actualizadoEnEsperado: parsedInput.actualizadoEnEsperado,
    })
    if (guardado.ok) {
      revalidatePath(RUTAS.origenes, 'layout')
      // La versión de la fila la llevan también el formulario de Empresa y sus íconos.
      revalidatePath(RUTAS.empresa)
    }
    return guardado
  })
