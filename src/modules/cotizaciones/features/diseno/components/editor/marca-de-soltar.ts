import type { DestinoDeLaPieza } from '../../../../entities/diseno/orden-del-diseno'
import type { LugarDelId } from '../../hooks/ids-del-lienzo'

export type MarcaDeSoltar = 'antes' | 'despues' | null

// Dónde se dibuja la marca de lo que se arrastra sobre la pieza `indice` de `seccion`: el destino es el lugar de la pieza de abajo (`destinoDe()`) y
// `moverItemA()` lo cuenta sin la que se mueve; dentro de la misma sección y hacia abajo, cae después de esa pieza; si no, antes. En su propio lugar, nada.
export function marcaDeSoltar(
  destino: DestinoDeLaPieza | null,
  activo: LugarDelId | null,
  seccion: string,
  indice: number,
): MarcaDeSoltar {
  if (destino === null || destino.seccion !== seccion || destino.indice !== indice) return null
  if (activo === null || activo.seccion !== seccion) return 'antes'
  if (activo.indice === indice) return null
  return activo.indice < indice ? 'despues' : 'antes'
}

// Si lo que se arrastra cae al final de la sección (el hueco del «+»).
export const caeAlFinal = (
  destino: DestinoDeLaPieza | null,
  seccion: string,
  largo: number,
): boolean => destino !== null && destino.seccion === seccion && destino.indice >= largo
