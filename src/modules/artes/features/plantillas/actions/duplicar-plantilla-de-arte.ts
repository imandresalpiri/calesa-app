'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { duplicarPlantilla, type Creada } from '../../../composicion'
import { esquemaDuplicarPlantillaDeArte } from '../schemas/plantillas'

// Copia una plantilla de arte que quien mira ve (la RLS y la RPC lo comprueban) como privada suya, en el mismo origen y formato.
export const duplicarPlantillaDeArte = actionClient
  .inputSchema(esquemaDuplicarPlantillaDeArte)
  .action(async ({ parsedInput }): Promise<ResultadoDeAccion<Creada>> => {
    const hecho = await duplicarPlantilla(parsedInput)
    if (hecho.ok) {
      revalidatePath(RUTAS.artes)
    }
    return hecho
  })
