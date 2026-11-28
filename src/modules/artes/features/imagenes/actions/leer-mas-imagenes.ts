'use server'

import { fallo, type Resultado } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { actionClient } from '@/shared/lib/safe-action'
import { leerPaginaDeImagenes } from '../../../composicion'
import { MOTIVO_SIN_ARTES } from '../../../entities/permisos-de-artes'
import type { ImagenDeArte, PaginaDeArtes } from '../../../entities/tipos'
import { esquemaVerMasImagenes } from '../schemas/imagenes'

// «Ver más» de la biblioteca de imágenes: la página que sigue al cursor, leída en el servidor con la sesión de quien mira (la RLS decide qué ve).
// Una lectura, no una mutación: no revalida.
export const leerMasImagenesDeArte = actionClient
  .inputSchema(esquemaVerMasImagenes)
  .action(async ({ parsedInput, ctx }): Promise<Resultado<PaginaDeArtes<ImagenDeArte>>> => {
    if (!puede(ctx.permisos, 'cotizaciones.ver')) {
      return fallo('sin_permiso', MOTIVO_SIN_ARTES)
    }
    return leerPaginaDeImagenes(parsedInput.cursor)
  })
