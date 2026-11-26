// Subir o bajar una fase (D16): `fase_mover(p_fase, version, p_despues_de)` la pone «después de X»; nulo = primera. Las jubiladas también cuentan en
// el orden (la base renumera todas), así que aquí se mira la lista completa, tal como llega.
export type DireccionDeFase = 'subir' | 'bajar'

import { TOPE_DE_FASES } from '../flujo'

export const MOTIVO_YA_ES_LA_PRIMERA = 'Ya es la primera fase.'
export const MOTIVO_YA_ES_LA_ULTIMA = 'Ya es la última fase.'
// `fase_mover` renumera todas: con la lista cortada por el tope no se sabe dónde caen las que no se leyeron
// (`docs/DECISIONES.md` › «Reordenar renumera 0…n−1 y escribe sólo las filas que cambian.»).
export const MOTIVO_LISTA_CORTADA = `Hay más de ${String(TOPE_DE_FASES)} fases: con la lista cortada no se puede ordenar.`

// Por qué no se puede ordenar ninguna fase del flujo («Mover antes/después», «Subir/Bajar»; y en el diagrama, moverlas), o nulo si se puede.
export function motivoSinOrdenDeFases(flujo: { truncado: { fases: boolean } }): string | null {
  return flujo.truncado.fases ? MOTIVO_LISTA_CORTADA : null
}

// La fase tras la que va `id` al moverla, o `null` si ya está en el extremo (no hay movimiento). `{ despuesDe: null }` = quedar primera.
export function despuesDeAlMover(
  fases: readonly { id: string }[],
  id: string,
  direccion: DireccionDeFase,
): { despuesDe: string | null } | null {
  const i = fases.findIndex((f) => f.id === id)
  if (i < 0) {
    return null
  }
  if (direccion === 'subir') {
    // Después de la que está dos arriba; sin ella, primera.
    return i === 0 ? null : { despuesDe: fases[i - 2]?.id ?? null }
  }
  const debajo = fases[i + 1]
  return debajo === undefined ? null : { despuesDe: debajo.id }
}

// Por qué un botón de orden está apagado, o nulo si se puede.
export function motivoSinMover(
  fases: readonly { id: string }[],
  id: string,
  direccion: DireccionDeFase,
): string | null {
  if (despuesDeAlMover(fases, id, direccion) !== null) {
    return null
  }
  return direccion === 'subir' ? MOTIVO_YA_ES_LA_PRIMERA : MOTIVO_YA_ES_LA_ULTIMA
}
