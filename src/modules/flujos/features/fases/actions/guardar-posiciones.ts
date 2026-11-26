'use server'

import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { RUTAS } from '@/shared/lib/rutas'
import { actionClient } from '@/shared/lib/safe-action'
import { repositorioDeFases } from '../../../areas/fases/composicion'
import type { RespuestaDeFase } from '../../../entities/fases/respuestas'
import { esquemaGuardarPosiciones } from '../schemas/fases'
import { comoResultado, motivoSinPermisoDeFases, sinPermisoDeFases } from './resultado'

// Dónde se dibuja cada fase del lote en el diagrama: todo o nada, con la versión del flujo. Revalida la configuración (la versión nueva viaja en la
// respuesta) y no vehículos: la posición no cambia nada de ellos.
export const guardarPosiciones = actionClient
  .inputSchema(esquemaGuardarPosiciones)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<RespuestaDeFase>> => {
    const motivo = motivoSinPermisoDeFases(ctx.permisos, parsedInput.origenId)
    if (motivo !== null) {
      return sinPermisoDeFases(motivo)
    }
    const hecho = comoResultado(await repositorioDeFases.guardarPosiciones(parsedInput))
    if (hecho.ok) {
      revalidatePath(RUTAS.origenes, 'layout')
      revalidatePath(RUTAS.configuracionDeRepuestos, 'layout')
    }
    return hecho
  })
