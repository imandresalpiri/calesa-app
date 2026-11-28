'use server'

import { revalidatePath } from 'next/cache'
import { fallo } from '@/shared/lib/errores'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import type { Json } from '@/shared/types/database.types'
import { crearPlantilla, leerPlantillaParaEditar, type Creada } from '../../../composicion'
import { validarDocumento } from '../../../entities/documento'
import {
  motivoDelFormatoDestino,
  reacomodarEnOtroFormato,
} from '../../../entities/editor/otro-formato'
import { medidasDelFormato } from '../../../entities/formatos'
import { esquemaDuplicarEnOtroFormato } from '../schemas/plantillas'

const NO_ESTA = 'No encontramos esa plantilla de arte.'

// Copia una plantilla de arte que quien mira ve (la RLS) en otro formato del mismo tipo: cada capa reacomodada anclada a su centro y el texto
// con su tamaño (`reacomodarEnOtroFormato()`). Nace privada de quien duplica, en el origen de la fuente (la RPC lo comprueba, con las imágenes).
export const duplicarEnOtroFormato = actionClient
  .inputSchema(esquemaDuplicarEnOtroFormato)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<Creada>> => {
    const fuente = await leerPlantillaParaEditar(parsedInput.fuente)
    if (!fuente.ok) {
      return fuente
    }
    if (fuente.data === null) {
      return fallo('no_encontrado', NO_ESTA)
    }
    const motivo = motivoDelFormatoDestino(fuente.data.formato, parsedInput.formato)
    if (motivo !== null) {
      return fallo('regla', motivo, 'formato')
    }
    const medidas = medidasDelFormato(parsedInput.formato, {
      ancho: parsedInput.ancho ?? 0,
      alto: parsedInput.alto ?? 0,
    })
    if (!medidas.ok) {
      return fallo('validacion', medidas.error.mensaje, 'ancho')
    }
    const base =
      parsedInput.documento === null
        ? fuente.data.documento
        : validarDocumento(parsedInput.documento)
    if (!base.ok) {
      return base
    }
    const desde = { ancho: fuente.data.ancho, alto: fuente.data.alto }
    const copia = validarDocumento(reacomodarEnOtroFormato(base.data, desde, medidas.data))
    if (!copia.ok) {
      return copia
    }
    const hecho = await crearPlantilla({
      id: parsedInput.idNuevo,
      nombre: parsedInput.nombre,
      formato: parsedInput.formato,
      origenId: fuente.data.origenId,
      ...medidas.data,
      documento: copia.data as Json,
    })
    if (hecho.ok) {
      revalidatePath(RUTAS.artes)
    }
    return hecho
  })
