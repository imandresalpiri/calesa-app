// Lo que el lienzo del editor de artes dibuja con cuentas: el polígono regular que llena su caja, los extremos del degradado del fondo (el
// ángulo como en CSS: 0° hacia arriba, 90° hacia la derecha) y cómo entra una imagen en su caja, cubriéndola (recorte, alrededor de su foco)
// o contenida. Puro.
import { FOCO_AL_CENTRO, type CapaDe, type FocoDeLaFoto, type Punto } from '../documento'
import type { Medidas } from '../formatos'
import type { Caja } from './cajas'

const LADOS_MINIMOS_DEL_POLIGONO = 3

// Los vértices de un polígono regular con la punta arriba, estirados para llenar `ancho × alto`: [x0, y0, x1, y1, …], relativos a la caja.
export function puntosDelPoligono(lados: number, ancho: number, alto: number): number[] {
  const n = Math.max(LADOS_MINIMOS_DEL_POLIGONO, Math.round(lados))
  const vertices = Array.from({ length: n }, (_, i) => {
    const angulo = -Math.PI / 2 + (2 * Math.PI * i) / n
    return { x: Math.cos(angulo), y: Math.sin(angulo) }
  })
  const xs = vertices.map((v) => v.x)
  const ys = vertices.map((v) => v.y)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const sx = ancho / (Math.max(...xs) - minX)
  const sy = alto / (Math.max(...ys) - minY)
  return vertices.flatMap((v) => [(v.x - minX) * sx, (v.y - minY) * sy])
}

// Los extremos de la línea del degradado sobre `ancho × alto`, como `linear-gradient(<angulo>deg, …)`: pasa por el centro y llega a las
// esquinas.
export function puntosDelDegradado(
  medidas: Medidas,
  angulo: number,
): { inicio: Punto; fin: Punto } {
  const radianes = (angulo * Math.PI) / 180
  const dx = Math.sin(radianes)
  const dy = -Math.cos(radianes)
  const mitad = (Math.abs(medidas.ancho * dx) + Math.abs(medidas.alto * dy)) / 2
  const cx = medidas.ancho / 2
  const cy = medidas.alto / 2
  return {
    inicio: { x: cx - dx * mitad, y: cy - dy * mitad },
    fin: { x: cx + dx * mitad, y: cy + dy * mitad },
  }
}

const sinLado = (m: Medidas) => !(m.ancho > 0 && m.alto > 0)

const entre = (valor: number, minimo: number, maximo: number) =>
  Math.min(Math.max(valor, minimo), maximo)

// La parte de la imagen (en sus px) que cubre la caja sin deformarse: del mismo tamaño que siempre, centrada en el foco (fracciones de la
// imagen; sin foco, el centro) y corrida hasta el borde cuando el foco está tan cerca de él que el recorte se saldría.
export function recorteParaCubrir(
  imagen: Medidas,
  caja: Medidas,
  foco: FocoDeLaFoto = FOCO_AL_CENTRO,
): Caja {
  if (sinLado(imagen) || sinLado(caja)) {
    return { x: 0, y: 0, ancho: imagen.ancho, alto: imagen.alto }
  }
  const escala = Math.max(caja.ancho / imagen.ancho, caja.alto / imagen.alto)
  const ancho = caja.ancho / escala
  const alto = caja.alto / escala
  return {
    x: entre(imagen.ancho * foco.x - ancho / 2, 0, imagen.ancho - ancho),
    y: entre(imagen.alto * foco.y - alto / 2, 0, imagen.alto - alto),
    ancho,
    alto,
  }
}

// Dónde va la imagen entera dentro de la caja (relativo a su esquina), centrada y sin deformarse.
export function cajaParaContener(imagen: Medidas, caja: Medidas): Caja {
  if (sinLado(imagen) || sinLado(caja)) {
    return { x: 0, y: 0, ancho: caja.ancho, alto: caja.alto }
  }
  const escala = Math.min(caja.ancho / imagen.ancho, caja.alto / imagen.alto)
  const ancho = imagen.ancho * escala
  const alto = imagen.alto * escala
  return { x: (caja.ancho - ancho) / 2, y: (caja.alto - alto) / 2, ancho, alto }
}

export const ALINEACION_EN_EL_LIENZO: Readonly<
  Record<CapaDe<'texto'>['alineacion'], 'left' | 'center' | 'right'>
> = { izquierda: 'left', centro: 'center', derecha: 'right' }
