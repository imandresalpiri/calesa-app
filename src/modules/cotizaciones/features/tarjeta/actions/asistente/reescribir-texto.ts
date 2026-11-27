'use server'

import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import { esquemaDeReescribir } from '../../schemas/asistente'
import { redactarSobreLaCotizacion } from './redactar'

// «Reescribir» un texto de compartir de una cotización con una instrucción libre al asistente de IA. Como generar: sin revalidar y sin salir por
// ninguna entrada.
export const reescribirTextoConElAsistente = actionClient
  .inputSchema(esquemaDeReescribir)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<{ texto: string }>> =>
    redactarSobreLaCotizacion(
      parsedInput.cotizacionId,
      { tipo: 'reescribir', instruccion: parsedInput.instruccion, texto: parsedInput.texto },
      ctx.permisos,
    ),
  )
