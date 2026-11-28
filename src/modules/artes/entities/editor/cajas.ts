// Las cajas del lienzo del editor de artes: la caja alineada a los ejes que ocupa una capa (rotada alrededor de su centro), la que encierra
// varias, si dos se cruzan (el recuadro de selección) y su centro. En unidades del documento. Puro.
import type { Punto } from '../documento'

export type Caja = { x: number; y: number; ancho: number; alto: number }

type ConCaja = { x: number; y: number; ancho: number; alto: number; rotacion: number }

export function centro(caja: Caja): Punto {
  return { x: caja.x + caja.ancho / 2, y: caja.y + caja.alto / 2 }
}

// La caja alineada a los ejes que encierra la de la capa rotada `rotacion` grados alrededor de su centro. Sin rotación, la misma.
export function cajaDe(capa: ConCaja): Caja {
  const caja = { x: capa.x, y: capa.y, ancho: capa.ancho, alto: capa.alto }
  const radianes = (capa.rotacion * Math.PI) / 180
  const coseno = Math.abs(Math.cos(radianes))
  const seno = Math.abs(Math.sin(radianes))
  if (seno < 1e-12) {
    return caja
  }
  const ancho = capa.ancho * coseno + capa.alto * seno
  const alto = capa.ancho * seno + capa.alto * coseno
  const medio = centro(caja)
  return { x: medio.x - ancho / 2, y: medio.y - alto / 2, ancho, alto }
}

// La caja que encierra a todas; sin ninguna, nula.
export function union(cajas: readonly Caja[]): Caja | null {
  if (cajas.length === 0) {
    return null
  }
  const izquierda = Math.min(...cajas.map((c) => c.x))
  const arriba = Math.min(...cajas.map((c) => c.y))
  const derecha = Math.max(...cajas.map((c) => c.x + c.ancho))
  const abajo = Math.max(...cajas.map((c) => c.y + c.alto))
  return { x: izquierda, y: arriba, ancho: derecha - izquierda, alto: abajo - arriba }
}

// Si se tocan o se pisan: tocarse por el borde cuenta.
export function seCruzan(a: Caja, b: Caja): boolean {
  return a.x <= b.x + b.ancho && b.x <= a.x + a.ancho && a.y <= b.y + b.alto && b.y <= a.y + a.alto
}

// Si el punto cae dentro de la caja (el borde cuenta).
export function contiene(caja: Caja, punto: Punto): boolean {
  return (
    punto.x >= caja.x &&
    punto.x <= caja.x + caja.ancho &&
    punto.y >= caja.y &&
    punto.y <= caja.y + caja.alto
  )
}
