'use client'

import type { CapaDeArte, SombraDeCapa } from '../../../../../entities/documento'
import { NOMBRE_DE_LA_CAPA } from '../../../hooks/nodos-del-lienzo'

// El relleno de lo que no se pinta pero se puede tocar: Konva sólo detecta el clic donde hay relleno o borde.
export const TRANSPARENTE = 'transparent'
// El ancho, en px de pantalla, por donde se puede agarrar una línea o un trazo fino.
export const AGARRE_EN_PANTALLA = 10

export type Interaccion = { arrastrable: boolean; escucha: boolean }

// La posición de la capa en Konva: el nodo va en el centro de su caja y gira alrededor de él (`offset` = la mitad de la caja; una elipse
// ya se dibuja desde su centro). `x, y` del documento es la esquina sin rotar.
export function atributosDeLaCapa(
  capa: CapaDeArte,
  { arrastrable, escucha }: Interaccion,
  desdeElCentro = false,
) {
  return {
    id: capa.id,
    name: NOMBRE_DE_LA_CAPA,
    x: capa.x + capa.ancho / 2,
    y: capa.y + capa.alto / 2,
    offsetX: desdeElCentro ? 0 : capa.ancho / 2,
    offsetY: desdeElCentro ? 0 : capa.alto / 2,
    rotation: capa.rotacion,
    opacity: capa.opacidad,
    draggable: arrastrable,
    listening: escucha,
    perfectDrawEnabled: false,
  }
}

export function sombraDe(sombra: SombraDeCapa | null) {
  if (!sombra) {
    return { shadowEnabled: false }
  }
  return {
    shadowEnabled: true,
    shadowColor: sombra.color,
    shadowBlur: sombra.desenfoque,
    shadowOffsetX: sombra.x,
    shadowOffsetY: sombra.y,
  }
}
