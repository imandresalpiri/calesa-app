'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { esquemaDeGenerar } from '../../schemas/asistente'
import { redactarSobreLaCotizacion } from './redactar'

// «Generar» el texto de compartir de una cotización con un atajo del asistente de IA. No muta nada que se vea: sin revalidar. La usa el panel de
// compartir de esta área; no sale por ninguna entrada.
export const generarTextoConElAsistente = actionClient
  .inputSchema(esquemaDeGenerar)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<{ texto: string }>> =>
    redactarSobreLaCotizacion(
      parsedInput.cotizacionId,
      { tipo: 'generar', atajoId: parsedInput.atajoId, texto: parsedInput.texto },
      ctx.permisos,
    ),
  )
