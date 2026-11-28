'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { crearPlantilla, type Creada } from '../../../composicion'
import { documentoVacio } from '../../../entities/documento'
import { medidasDelFormato } from '../../../entities/formatos'
import { MOTIVO_SIN_COTIZACIONES_DEL_ORIGEN } from '../../../entities/permisos-de-artes'
import { esquemaCrearPlantillaDeArte } from '../schemas/plantillas'

// Crea una plantilla de arte privada, vacía, en un origen donde quien la crea ve cotizaciones, con el id del intento: repetirla no crea otra.
export const crearPlantillaDeArte = actionClient
  .inputSchema(esquemaCrearPlantillaDeArte)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<Creada>> => {
    if (!puede(ctx.permisos, 'cotizaciones.ver', parsedInput.origenId)) {
      return fallo('sin_permiso', MOTIVO_SIN_COTIZACIONES_DEL_ORIGEN)
    }
    const medidas = medidasDelFormato(parsedInput.formato, {
      ancho: parsedInput.ancho ?? 0,
      alto: parsedInput.alto ?? 0,
    })
    if (!medidas.ok) {
      return fallo('validacion', medidas.error.mensaje, 'ancho')
    }
    const hecho = await crearPlantilla({
      id: parsedInput.id,
      nombre: parsedInput.nombre,
      formato: parsedInput.formato,
      origenId: parsedInput.origenId,
      ...medidas.data,
      documento: documentoVacio(),
    })
    if (hecho.ok) {
      revalidatePath(RUTAS.artes)
    }
    return hecho
  })
