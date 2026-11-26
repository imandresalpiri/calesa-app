import { z } from 'zod'
import type { ResultadoDeAccion } from '../enviar-accion'
import { errorDePostgrest, type ErrorPostgrest } from '../errores'

// Al quitar un elemento con ítems, a dónde van antes (nulo = «Sin grupo» / «Sin categoría»).
export type DestinoAlQuitar = { mover: false } | { mover: true; destino: string | null }

export const esquemaDestinoAlQuitar = z.discriminatedUnion('mover', [
  z.object({ mover: z.literal(false) }),
  z.object({ mover: z.literal(true), destino: z.guid().nullable() }),
])

// Qué dato rechazó la base, por el `hint` de su error: el nombre («Ya existe «X».»), los ítems que tiene (`campos`, `preguntas`: hay
// que moverlos antes de quitar) o el destino elegido para moverlos.
const DATO_DE_LA_PISTA: Readonly<Record<string, string>> = {
  nombre: 'nombre',
  campos: 'items',
  preguntas: 'items',
  destino: 'destino',
}

// Un error de una escritura de catálogo como valor: el texto de la base (si es legible) y, si nombra un dato, en `porCampo` bajo esa
// clave, para decirlo junto a él en el drawer o en el diálogo de quitar.
export function rechazoDelCatalogo(
  error: ErrorPostgrest & { hint?: string | null },
): ResultadoDeAccion<never> {
  const base = errorDePostgrest(error)
  const dato = error.hint ? DATO_DE_LA_PISTA[error.hint] : undefined
  return dato
    ? { ok: false, error: base, porCampo: { [dato]: base.mensaje } }
    : { ok: false, error: base }
}
