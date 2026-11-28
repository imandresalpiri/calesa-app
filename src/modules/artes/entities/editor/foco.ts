// El foco de una foto del arte en el inspector (docs/GLOSARIO.md › «Capa»): dónde se ve la foto entera dentro de la vista previa (que mide
// siempre lo mismo), qué foco es un toque sobre ella y cómo lo corren las flechas. El foco va en fracciones de la foto, de 0 a 1. Puro.
import type { FocoDeLaFoto } from '../documento'
import type { Medidas } from '../formatos'
import { cajaParaContener } from './dibujo'

// La vista previa del foco: 3 × 2, como la mayoría de las fotos de un vehículo.
export const PROPORCION_DE_LA_VISTA_DEL_FOCO: Medidas = { ancho: 3, alto: 2 }

// Cuánto corre el foco una flecha (con Mayús, de a 1 %).
export const PASO_DEL_FOCO = 0.05
export const PASO_FINO_DEL_FOCO = 0.01

const DECIMALES_DEL_FOCO = 1000

const enRango = (valor: number) =>
  Math.round(Math.min(1, Math.max(0, valor)) * DECIMALES_DEL_FOCO) / DECIMALES_DEL_FOCO

// Dónde va la foto entera dentro de la vista previa, en por ciento de ella; sin medidas, la vista entera.
export function dondeSeVeLaFoto(natural: Medidas | null): {
  izquierda: number
  arriba: number
  ancho: number
  alto: number
} {
  const vista = PROPORCION_DE_LA_VISTA_DEL_FOCO
  const caja = natural
    ? cajaParaContener(natural, vista)
    : { x: 0, y: 0, ancho: vista.ancho, alto: vista.alto }
  return {
    izquierda: (caja.x / vista.ancho) * 100,
    arriba: (caja.y / vista.alto) * 100,
    ancho: (caja.ancho / vista.ancho) * 100,
    alto: (caja.alto / vista.alto) * 100,
  }
}

// El foco de un toque en `punto` sobre la foto dibujada de `medidas` (las dos en px de pantalla): acotado a la foto y con tres decimales.
export function focoEnElPunto(punto: { x: number; y: number }, medidas: Medidas): FocoDeLaFoto {
  if (!(medidas.ancho > 0 && medidas.alto > 0)) {
    return { x: 0.5, y: 0.5 }
  }
  return { x: enRango(punto.x / medidas.ancho), y: enRango(punto.y / medidas.alto) }
}

const SENTIDOS: Readonly<Record<string, readonly [number, number]>> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
}

// El foco tras una flecha (`null` si la tecla no es una flecha): de a 5 %, o de a 1 % con Mayús, sin salir de la foto.
export function focoConFlecha(
  foco: FocoDeLaFoto,
  tecla: string,
  fino: boolean,
): FocoDeLaFoto | null {
  const sentido = SENTIDOS[tecla]
  if (!sentido) {
    return null
  }
  const paso = fino ? PASO_FINO_DEL_FOCO : PASO_DEL_FOCO
  return { x: enRango(foco.x + sentido[0] * paso), y: enRango(foco.y + sentido[1] * paso) }
}

// El foco con uno de sus ejes escrito en por ciento (el campo «Foco X» o «Foco Y» del inspector).
export function focoConPorCiento(
  foco: FocoDeLaFoto,
  eje: keyof FocoDeLaFoto,
  porCiento: number,
): FocoDeLaFoto {
  return { ...foco, [eje]: enRango(porCiento / 100) }
}
