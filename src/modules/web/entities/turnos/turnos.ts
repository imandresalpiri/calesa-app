// Mis turnos de la web sin confirmar (8.05-1): la forma de una fila, el contrato de la lectura y su orden. Puro: sin I/O.
import type { Resultado } from '@/shared/lib/errores'

export type EstadoDeTurno = 'asignada' | 'vencida'

export type Turno = {
  id: string
  // `#WEB-XXXX`, tal cual lo dio la base.
  codigo: string
  // Texto libre del sitio (`boton_general`, `vehiculo`…): se muestra sin catálogo.
  fuente: string
  vehiculoId: string | null
  // Nulo si el vehículo ya no es público (`web.vehiculos` sólo trae los visibles) o no hay vehículo.
  titulo: string | null
  // Nulo: contacto directo por handle, sin reloj.
  venceEn: string | null
  estado: EstadoDeTurno
}

// Dónde sigue la lista de mis turnos: el último que se vio. Las vigentes (`asignada`) van antes que las `vencida`, cada grupo con su orden (`ordenarTurnos`),
// así que el cursor dice de qué grupo es, su `vence_en` y su id: una clave estable que no se corre aunque otro turno venza o se confirme (nada de `offset`).
export type CursorDeMisTurnos = { grupo: EstadoDeTurno; venceEn: string | null; id: string }

// Pide `tope + 1` filas y devuelve hasta `tope` con si había más (nunca un total). Sólo los turnos de quien lee. `desde`: lo que sigue después de ese cursor
// (sin él, la primera página: lo que lee el bloque de Inicio).
export type LectorDeMisTurnos = (pedido: {
  tope: number
  desde?: CursorDeMisTurnos | null
}) => Promise<Resultado<{ filas: Turno[]; hayMas: boolean }>>

// El panel «Turnos de la web sin confirmar» carga de a `TAMANO_DE_VER_MAS` y hasta acá; pasado el tope dice que hay más y manda a confirmar los de arriba.
export const TOPE_DE_TURNOS_CARGADOS = 200

export function cursorDelTurno(turno: Turno): CursorDeMisTurnos {
  return { grupo: turno.estado, venceEn: turno.venceEn, id: turno.id }
}

function aMs(iso: string): number {
  return Date.parse(iso)
}

// Primero las vigentes (`asignada`) por `vence_en` ascendente, las directas (sin reloj) al final de las vigentes; luego las `vencida`,
// de la que venció hace menos a la que venció hace más: una vencida vieja no tapa a las vigentes.
export function ordenarTurnos(asignadas: readonly Turno[], vencidas: readonly Turno[]): Turno[] {
  const vigentes = [...asignadas].sort((a, b) => {
    if (a.venceEn === null && b.venceEn === null) return a.id.localeCompare(b.id)
    if (a.venceEn === null) return 1
    if (b.venceEn === null) return -1
    return aMs(a.venceEn) - aMs(b.venceEn) || a.id.localeCompare(b.id)
  })
  const pasadas = [...vencidas].sort(
    (a, b) => aMs(b.venceEn ?? '') - aMs(a.venceEn ?? '') || a.id.localeCompare(b.id),
  )
  return [...vigentes, ...pasadas]
}
