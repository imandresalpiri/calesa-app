// La última pestaña que la persona abrió en cada origen (docs/GLOSARIO.md › «Última pestaña del origen»): `origenes.ultima_pestana`, un objeto
// `{ <origenId>: <pestaña> }` en `preferencias_usuario`. No entra en `Preferencias` (viajaría en el HTML de toda pantalla): la lee sólo la
// redirección de `/configuracion/origenes/<id>` y la escribe la barra de pestañas al cambiar. Puro.
import { z } from 'zod'
import { PARTES_DEL_ORIGEN, type ParteDelOrigen } from '@/shared/lib/rutas'

export const CLAVE_DE_ULTIMA_PESTANA = 'origenes.ultima_pestana'

// Cuántos orígenes se recuerdan: los más viejos se olvidan. Espejo del CHECK `preferencias_ultima_pestana_valida`.
export const TOPE_DE_PESTANAS_RECORDADAS = 30

export type PestanasRecordadas = Record<string, ParteDelOrigen>

const esUnId = (valor: string) => z.guid().safeParse(valor).success

export const esParteDelOrigen = (valor: unknown): valor is ParteDelOrigen =>
  typeof valor === 'string' && (PARTES_DEL_ORIGEN as readonly string[]).includes(valor)

// Lo guardado, tolerante: descarta lo que no es un objeto, una clave que no es un id y una pestaña que ya no existe (una renombrada).
export function pestanasRecordadasDesde(crudo: unknown): PestanasRecordadas {
  if (typeof crudo !== 'object' || crudo === null || Array.isArray(crudo)) {
    return {}
  }
  const recordadas: PestanasRecordadas = {}
  for (const [origenId, parte] of Object.entries(crudo)) {
    if (esUnId(origenId) && esParteDelOrigen(parte)) {
      recordadas[origenId] = parte
    }
  }
  return recordadas
}

// Lo guardado con esta pestaña en este origen: el origen pasa al final (el más reciente) y, pasado el tope, se olvidan los más viejos.
export function conLaPestana(
  previas: PestanasRecordadas,
  origenId: string,
  parte: ParteDelOrigen,
): PestanasRecordadas {
  const entradas = Object.entries(previas).filter(([id]) => id !== origenId)
  entradas.push([origenId, parte])
  return Object.fromEntries(entradas.slice(-TOPE_DE_PESTANAS_RECORDADAS))
}

export const esquemaRecordarPestana = z.object({
  origenId: z.guid(),
  parte: z.enum(PARTES_DEL_ORIGEN),
})
