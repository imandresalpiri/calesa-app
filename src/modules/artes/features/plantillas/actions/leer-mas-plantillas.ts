'use server'

import { fallo, type Resultado } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { actionClient } from '@/shared/lib/safe-action'
import { leerPaginaDePlantillas } from '../../../composicion'
import { MOTIVO_SIN_ARTES } from '../../../entities/permisos-de-artes'
import type { PaginaDeArtes, PlantillaDeArte } from '../../../entities/tipos'
import { esquemaVerMasPlantillas } from '../schemas/plantillas'

// «Ver más» de la rejilla de plantillas de arte: la página que sigue al cursor, con los mismos filtros, leída en el servidor con la sesión de
// quien mira (la RLS decide qué ve; «Mías» es de la sesión, no del navegador). Una lectura, no una mutación: no revalida.
export const leerMasPlantillasDeArte = actionClient
  .inputSchema(esquemaVerMasPlantillas)
  .action(async ({ parsedInput, ctx }): Promise<Resultado<PaginaDeArtes<PlantillaDeArte>>> => {
    if (!puede(ctx.permisos, 'cotizaciones.ver')) {
      return fallo('sin_permiso', MOTIVO_SIN_ARTES)
    }
    return leerPaginaDePlantillas(parsedInput.pedido, ctx.usuarioId, parsedInput.cursor)
  })
