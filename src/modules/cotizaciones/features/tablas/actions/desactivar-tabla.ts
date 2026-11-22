'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { fallo } from '@/shared/lib/errores'
import { puede } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeTablas } from '../../../areas/tablas/composicion'
import { MOTIVO_SIN_PERMISO_DE_TABLA } from '../../../entities/tablas/publicacion'
import type { TablaDesactivada } from '../../../entities/tablas/resultado-de-estructura'
import { esquemaDeDesactivarTabla } from '../schemas/estructura-de-tabla'

// Desactiva una tabla que ninguna fórmula usa (`tabla_referencia_desactivar()`), con la versión que se leyó. No se deshace desde la app. Sólo si entró, las
// pestañas se vuelven a leer.
export const desactivarTabla = actionClient
  .inputSchema(esquemaDeDesactivarTabla)
  .action(
    async ({
      parsedInput: { origenId, ...pedido },
      ctx,
    }): Promise<ResultadoDeAccion<TablaDesactivada>> => {
      if (!puede(ctx.permisos, 'cotizaciones.configurar', origenId)) {
        return fallo('sin_permiso', MOTIVO_SIN_PERMISO_DE_TABLA)
      }
      const hecho = await repositorioDeTablas.desactivar(pedido)
      if (hecho.ok) {
        revalidatePath(RUTAS.origenes, 'layout')
      }
      return hecho
    },
  )
