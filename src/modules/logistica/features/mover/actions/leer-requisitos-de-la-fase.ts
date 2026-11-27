'use server'

import { z } from 'zod'
import {
  esquemaLeerRequisitosDeFase,
  leerRequisitosDeFase,
  type RequisitoVista,
} from '@/modules/flujos'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import type { AccionesDelRequisito } from '../../../entities/mover/accion-de-requisito'
import { resolverAccionesDeQueFalta } from '../../../entities/mover/acciones-de-requisito'
import { capacidadesDeQueFalta } from '../../../entities/mover/capacidades-de-que-falta'
import { requisitoQueFalta } from './requisito-que-falta'

/** Lo que pide una fase de la cadena que no es un destino de hoy: sus requisitos y, por cada uno que falta, la acción que lo destraba (resuelta con los permisos de quien mira). */
export type RequisitosDeLaFase = {
  requisitos: RequisitoVista[]
  acciones: Record<string, AccionesDelRequisito>
}

// El pedido: la unidad y la fase (el esquema de `flujos`) y el nombre de la fase, que sólo escribe el título de «Pedirlo» («… para entrar a «X»»).
const esquema = z.object({
  pedido: esquemaLeerRequisitosDeFase,
  nombre: z.string().trim().max(200),
})

// La fase que se toca en la cadena y no es una salida de la actual: la misma vista previa de mover (`leerRequisitosDeFase` de `flujos`), sin «Mover». Se lee al tocarla, no
// al cargar la página. Las capacidades salen de `puede()` en el servidor, como en `leerQueFalta`; la base vuelve a exigir cada acción.
export const leerRequisitosDeLaFase = actionClient
  .inputSchema(esquema)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<RequisitosDeLaFase>> => {
    const { unidad, origenId, fase } = parsedInput.pedido
    const leido = await leerRequisitosDeFase({ unidad, faseId: fase })
    if (!leido.ok) return leido
    const id = unidad.tipo === 'vehiculo' ? unidad.vehiculoId : unidad.repuestoId
    const { requisitos } = leido.data
    const acciones = resolverAccionesDeQueFalta(
      [{ nombre: parsedInput.nombre, requisitos: requisitos.map(requisitoQueFalta) }],
      {
        unidad: { tipo: unidad.tipo, id },
        capacidades: capacidadesDeQueFalta(ctx.permisos, { tipo: unidad.tipo, origenId }),
      },
    )
    return { ok: true, data: { requisitos, acciones } }
  })
