// Las pasadas de la cadena de la unidad como llegan de `historial_fases` (la lectura del servidor, `infra/mover/historial.ts`): la fila, su fase embebida y quién la
// movió. Sin I/O.
import { z } from 'zod'
import type { PasadaLeida } from './cadena'

/** Cuántas pasadas dibuja la cadena; con más, la marca «Cambios anteriores» abre la tarjeta Historial. */
export const TOPE_DE_PASADAS = 50

// Las columnas que pide la lectura: la fase a la que entró (con su nombre, color y si sigue activa) y el nombre de quien la movió.
export const COLUMNAS_DE_PASADA =
  'id, creado_en, nota, a_fase_id, usuario_id, a:fases!historial_fases_a_fase_id_fkey(nombre, color, activa), quien:perfiles!historial_fases_usuario_id_fkey(nombre)'

const esquemaDeLaFila = z.object({
  id: z.number().int(),
  creado_en: z.string().min(10),
  nota: z.string().nullable(),
  a_fase_id: z.guid(),
  usuario_id: z.guid().nullable(),
  a: z.object({ nombre: z.string(), color: z.string().nullable(), activa: z.boolean() }),
  quien: z.object({ nombre: z.string().nullable() }).nullable(),
})

/** Las filas leídas (hasta `TOPE_DE_PASADAS` + 1, de la más nueva a la más vieja) como pasadas y si hay más; nulo si no son lo que promete la consulta. */
export function pasadasDesde(crudo: unknown): { pasadas: PasadaLeida[]; hayMas: boolean } | null {
  const leidas = z.array(esquemaDeLaFila).safeParse(crudo)
  if (!leidas.success) return null
  return {
    pasadas: leidas.data.slice(0, TOPE_DE_PASADAS).map((f) => ({
      historialId: f.id,
      aFaseId: f.a_fase_id,
      nombre: f.a.nombre,
      color: f.a.color,
      activa: f.a.activa,
      entro: f.creado_en,
      quienId: f.usuario_id,
      quien: f.quien?.nombre ?? null,
      nota: f.nota,
    })),
    hayMas: leidas.data.length > TOPE_DE_PASADAS,
  }
}
