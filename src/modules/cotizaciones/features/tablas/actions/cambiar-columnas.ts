'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeTablas } from '../../../areas/tablas/composicion'
import { MOTIVO_SIN_PERMISO_DE_TABLA } from '../../../entities/tablas/publicacion'
import type { ColumnasCambiadas } from '../../../entities/tablas/resultado-de-estructura'
import { esquemaDeCambiarColumnas } from '../schemas/estructura-de-tabla'

// Cambia las columnas de una tabla (`tabla_referencia_columnas()`) con la lista entera y la versión que se leyó: la base calcula qué se suma, renombra, mueve o
// quita, rechaza quitar una columna en uso, sube la versión y pide el permiso de cada origen que la usa. Sólo si entró, las pestañas se vuelven a leer (el
// editor de filas se remonta con la versión nueva: «Columnas» no se abre con cambios de filas sin publicar).
export const cambiarColumnas = actionClient
  .inputSchema(esquemaDeCambiarColumnas)
  .action(
    async ({
      parsedInput: { origenId, ...pedido },
      ctx,
    }): Promise<ResultadoDeAccion<ColumnasCambiadas>> => {
      if (!puede(ctx.permisos, 'cotizaciones.configurar', origenId)) {
        return fallo('sin_permiso', MOTIVO_SIN_PERMISO_DE_TABLA)
      }
      const hecho = await repositorioDeTablas.cambiarColumnas(pedido)
      if (hecho.ok) {
        revalidatePath(RUTAS.origenes, 'layout')
      }
      return hecho
    },
  )
