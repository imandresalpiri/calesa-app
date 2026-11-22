// La condición de «lo que sigue después de este turno» en la lista de mis turnos (`consulta-de-mis-turnos.ts`), como filtro `or()` de PostgREST. Es la clave de
// orden de cada grupo: `vence_en` (ascendente en las vigentes `asignada`, descendente en las `vencida`) con los turnos sin reloj al final (las directas) y el id
// de desempate. Una condición de índice, nunca un `offset`.
import { citar } from '@/shared/lib/supabase/consultas'
import type { CursorDeMisTurnos } from '../../entities/turnos/turnos'

export function filtroDelCursorDeTurnos(cursor: CursorDeMisTurnos): string {
  const id = citar(cursor.id)
  // Sin reloj van al final; entre sí, por id.
  if (cursor.venceEn === null) return `and(vence_en.is.null,id.gt.${id})`
  const instante = citar(cursor.venceEn)
  const despues = cursor.grupo === 'asignada' ? 'gt' : 'lt'
  return `vence_en.${despues}.${instante},and(vence_en.eq.${instante},id.gt.${id}),vence_en.is.null`
}
