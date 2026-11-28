// Alinear y distribuir en el editor de artes. Opera por unidades (un grupo entero o una capa suelta, ya armadas por quien llama) y devuelve
// cuánto correr cada una, en el mismo orden. Con una sola unidad se alinea contra el documento; con varias, contra la caja que las encierra.
// Puro.
import type { Medidas } from '../formatos'
import { union, type Caja } from './cajas'

export type Alineacion = 'izquierda' | 'centro' | 'derecha' | 'arriba' | 'medio' | 'abajo'
export type Corrimiento = { dx: number; dy: number }

const QUIETO: Corrimiento = { dx: 0, dy: 0 }

// Dónde tiene que quedar la unidad, según la alineación y el marco (el documento o la unión).
function corrimientoDe(caja: Caja, como: Alineacion, marco: Caja): Corrimiento {
  switch (como) {
    case 'izquierda':
      return { dx: marco.x - caja.x, dy: 0 }
    case 'centro':
      return { dx: marco.x + marco.ancho / 2 - (caja.x + caja.ancho / 2), dy: 0 }
    case 'derecha':
      return { dx: marco.x + marco.ancho - (caja.x + caja.ancho), dy: 0 }
    case 'arriba':
      return { dx: 0, dy: marco.y - caja.y }
    case 'medio':
      return { dx: 0, dy: marco.y + marco.alto / 2 - (caja.y + caja.alto / 2) }
    case 'abajo':
      return { dx: 0, dy: marco.y + marco.alto - (caja.y + caja.alto) }
  }
}

export function alinear(
  unidades: readonly Caja[],
  como: Alineacion,
  documento: Medidas,
): Corrimiento[] {
  const marco =
    unidades.length === 1
      ? { x: 0, y: 0, ancho: documento.ancho, alto: documento.alto }
      : union(unidades)
  if (marco === null) {
    return []
  }
  return unidades.map((caja) => corrimientoDe(caja, como, marco))
}

// Con 3 o más: los extremos quedan quietos y los huecos entre cajas (ordenadas por su borde inicial) quedan iguales. Con menos, nada.
export function distribuir(
  unidades: readonly Caja[],
  eje: 'horizontal' | 'vertical',
): Corrimiento[] {
  if (unidades.length < 3) {
    return unidades.map(() => QUIETO)
  }
  const enX = eje === 'horizontal'
  const inicio = (c: Caja) => (enX ? c.x : c.y)
  const largo = (c: Caja) => (enX ? c.ancho : c.alto)
  const orden = unidades
    .map((caja, i) => ({ caja, i }))
    .sort((a, b) => inicio(a.caja) - inicio(b.caja))
  const primera = orden[0]?.caja
  const ultima = orden.at(-1)?.caja
  if (!primera || !ultima) {
    return unidades.map(() => QUIETO)
  }
  const ocupado = orden.reduce((suma, { caja }) => suma + largo(caja), 0)
  const hueco = (inicio(ultima) + largo(ultima) - inicio(primera) - ocupado) / (orden.length - 1)
  const salida: Corrimiento[] = unidades.map(() => QUIETO)
  let cursor = inicio(primera)
  for (const { caja, i } of orden) {
    const delta = cursor - inicio(caja)
    salida[i] = enX ? { dx: delta, dy: 0 } : { dx: 0, dy: delta }
    cursor += largo(caja) + hueco
  }
  return salida
}
