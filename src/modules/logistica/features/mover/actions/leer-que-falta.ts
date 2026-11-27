'use server'

import { esquemaLeerParaMover, leerParaMoverDe, type ParaMover } from '@/modules/flujos'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { actionClient } from '@/shared/lib/safe-action'
import type { AccionesDelRequisito } from '../../../entities/mover/accion-de-requisito'
import { resolverAccionesDeQueFalta } from '../../../entities/mover/acciones-de-requisito'
import { capacidadesDeQueFalta } from '../../../entities/mover/capacidades-de-que-falta'
import { requisitoQueFalta } from './requisito-que-falta'

/** Lo que lee «Qué falta»: lo de `flujos` y, por requisito que falta, la acción que lo destraba (ya resuelta con los permisos de quien mira). */
export type QueFalta = ParaMover & { acciones: Record<string, AccionesDelRequisito> }

// La lectura de «Qué falta» (la de `flujos`, sin otra consulta) con las acciones de cada requisito: las capacidades salen de `puede()` en el servidor, así que ni
// los permisos ni la regla viajan al navegador. Usa los permisos reales (como `puedeMover`), no los de «Ver como». La base vuelve a exigir cada acción.
export const leerQueFalta = actionClient
  .inputSchema(esquemaLeerParaMover)
  .action(async ({ parsedInput, ctx }): Promise<ResultadoDeAccion<QueFalta>> => {
    const leido = await leerParaMoverDe(parsedInput, ctx.permisos)
    if (!leido.ok) return leido
    const { unidad, origenId } = parsedInput
    const id = unidad.tipo === 'vehiculo' ? unidad.vehiculoId : unidad.repuestoId
    const destinos = leido.data.destinos.flatMap((d) =>
      d.vista ? [{ nombre: d.nombre, requisitos: d.vista.requisitos.map(requisitoQueFalta) }] : [],
    )
    const acciones = resolverAccionesDeQueFalta(destinos, {
      unidad: { tipo: unidad.tipo, id },
      capacidades: capacidadesDeQueFalta(ctx.permisos, { tipo: unidad.tipo, origenId }),
    })
    return { ok: true, data: { ...leido.data, acciones } }
  })
