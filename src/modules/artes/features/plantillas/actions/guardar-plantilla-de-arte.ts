'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import type { Json } from '@/shared/types/database.types'
import { guardarPlantilla, type ConVersion } from '../../../composicion'
import { esquemaGuardarPlantillaDeArte } from '../schemas/plantillas'

// Guarda lo que el editor de artes cambió (la RPC repite el permiso, la versión y las imágenes). No revalida: el editor tiene algo a medio
// hacer y redibujarlo lo perdería; aplica la versión que devuelve.
export const guardarPlantillaDeArte = actionClient
  .inputSchema(esquemaGuardarPlantillaDeArte)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<ConVersion>> =>
    guardarPlantilla({ ...parsedInput, documento: parsedInput.documento as Json }),
  )
