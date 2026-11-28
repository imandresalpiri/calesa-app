// Lo que la persona eligió como vehículo de ejemplo de una plantilla de arte (docs/GLOSARIO.md › «Vehículo de ejemplo»): se recuerda en este
// navegador, por persona y plantilla, y no se guarda en el documento (lo lee y lo escribe `features/editor/hooks/ejemplo-recordado.ts`). Lo
// que llega del `localStorage` se valida: lo roto o ajeno no cuenta. Puro.
import { z } from 'zod'

export const esquemaDelEjemplo = z.object({
  vehiculoId: z.guid(),
  cotizacionId: z.guid().nullable(),
  leadId: z.guid().nullable(),
})
export type EjemploElegido = z.infer<typeof esquemaDelEjemplo>

// Sin vehículo elegido: los datos de ejemplo.
export const eleccionVacia = null

export function claveDelEjemplo(personaId: string, plantillaId: string): string {
  return `artes:ejemplo:${personaId}:${plantillaId}`
}

export function leerElEjemplo(crudo: string | null): EjemploElegido | null {
  if (crudo === null) {
    return null
  }
  try {
    const leido = esquemaDelEjemplo.safeParse(JSON.parse(crudo))
    return leido.success ? leido.data : null
  } catch {
    return null
  }
}
