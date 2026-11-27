import { conteoCorto } from '@/shared/lib/conteo'
import type { VehiculoNombrado } from './declaracion'

// Lo que Aduana dice de una declaración para que se entienda qué es y qué vehículos cubre. Puro: los nombres y el conteo los da la base.

export const QUE_ES_LA_DECLARACION =
  'Una declaración es el trámite de aduana de uno o varios vehículos.'

// Lo que queda sin nombrar se dice hasta «100+»: la fila no es un total exacto (la base cuenta hasta 201).
const TOPE_DEL_RESTO = 100

function enLista(nombres: readonly string[]): string {
  if (nombres.length <= 1) return nombres.join('')
  return `${nombres.slice(0, -1).join(', ')} y ${nombres.at(-1) ?? ''}`
}

/**
 * Los vehículos de una fila de Aduana: «Hilux, Ranger y 3 más» (los primeros que se ven, por título, y cuántos más), con «, y otros que no puedes ver» si hay ocultos. Vacío si
 * no se ve ninguno ni hay ocultos (la fila dice «Sin vehículos»).
 */
export function vehiculosDeLaFila(
  primeros: readonly VehiculoNombrado[],
  vehiculos: number,
  hayOcultos = false,
): string {
  const nombres = primeros.map((p) => p.titulo)
  const resto = vehiculos - nombres.length
  const vistos =
    resto > 0
      ? `${nombres.join(', ')} y ${conteoCorto({ n: Math.min(resto, TOPE_DEL_RESTO), hayMas: resto > TOPE_DEL_RESTO })} más`
      : enLista(nombres)
  if (!hayOcultos) return vistos
  return vistos === '' ? 'Otros que no puedes ver' : `${vistos}, y otros que no puedes ver`
}
