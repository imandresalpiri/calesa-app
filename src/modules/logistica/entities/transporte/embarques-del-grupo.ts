import { z } from 'zod'
import { ESTADOS_DEL_EMBARQUE, type EstadoDelEmbarque } from './estado'

// Los embarques de un grupo de transporte que quien mira ve (`transporte_grupo().embarques`): los del booking de la clave o, en un grupo por contenedor, los de sus contenedores. «Editar
// grupo» de un contenedor con embarque dice que lo del embarque cambia para todos sus vehículos, no sólo para los del contenedor.

export type EmbarqueDelGrupo = {
  id: string
  booking: string
  // Nulo: de repuestos.
  origenId: string | null
  actualizadoEn: string
  estado: EstadoDelEmbarque
}

export const esquemaDeEmbarquesDelGrupo = z
  .array(
    z.object({
      id: z.guid(),
      booking: z.string(),
      origen_id: z.guid().nullable(),
      actualizado_en: z.string(),
      estado: z.enum(ESTADOS_DEL_EMBARQUE),
    }),
  )
  .transform((lista) =>
    lista.map((e): EmbarqueDelGrupo => ({
      id: e.id,
      booking: e.booking,
      origenId: e.origen_id,
      actualizadoEn: e.actualizado_en,
      estado: e.estado,
    })),
  )

/**
 * En un grupo por contenedor, la línea sobre los campos: «La naviera, los puertos y las fechas son del embarque «B»: cambian para todos sus vehículos.» (con varios embarques, «de sus
 * embarques»); nula en un grupo por booking (ya es el embarque) o si sus contenedores no van en ninguno.
 */
export function lineaDelEmbarqueDelGrupo(
  tipo: 'booking' | 'contenedor',
  embarques: readonly EmbarqueDelGrupo[],
): string | null {
  if (tipo === 'booking' || embarques.length === 0) {
    return null
  }
  const bookings = [...new Set(embarques.map((e) => e.booking))]
  const de = bookings.length === 1 ? `del embarque «${bookings[0] ?? ''}»` : 'de sus embarques'
  return `La naviera, los puertos y las fechas son ${de}: cambian para todos sus vehículos.`
}
