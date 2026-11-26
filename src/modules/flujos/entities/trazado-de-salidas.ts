// Por dónde pasa cada salida del diagrama, dadas las cajas donde están ahora (`trazarSalida`). La **ruta** de una salida (recta o arco, su lado, su
// carril y sus puertos dentro de cada caja) la decide el acomodo automático sobre el orden (`disponerDiagrama`); el trazado la lleva a donde estén
// las cajas, guardadas o mientras se arrastran. Con las cajas en su acomodo automático da los mismos puntos que el acomodo: una sola fuente.
// Puro: sin I/O ni React. Todo en px.
import type {
  DisposicionDelDiagrama,
  LadoDelArco,
  MedidasDelDiagrama,
  Punto,
} from './disposicion-del-diagrama'

export type RutaDeSalida = {
  forma: 'recta' | 'arco'
  // Nulo en una recta.
  lado: LadoDelArco | null
  // 0 en una recta; desde 1 en un arco (el 1 es el más cercano a las cajas).
  carril: number
  // Dónde sale y llega un arco, medido desde el borde izquierdo de cada caja (en una recta, 0: sale por la derecha y llega por la izquierda).
  puertoDe: number
  puertoA: number
}

export type TrazoDeSalida = { puntos: Punto[]; etiqueta: Punto }

const medio = (a: Punto, b: Punto): Punto => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })

// Una recta: del borde derecho de una caja al izquierdo de la otra. A la misma altura, dos puntos; a otra, un escalón por el medio; si el destino
// queda detrás (o casi encima), una S por debajo de las dos cajas.
function recta(de: Punto, a: Punto, m: MedidasDelDiagrama): TrazoDeSalida {
  const inicio = { x: de.x + m.ancho, y: de.y + m.alto / 2 }
  const fin = { x: a.x, y: a.y + m.alto / 2 }
  const codo = m.carril
  if (fin.x - inicio.x >= 2 * codo || (fin.x > inicio.x && inicio.y === fin.y)) {
    if (inicio.y === fin.y) {
      return { puntos: [inicio, fin], etiqueta: medio(inicio, fin) }
    }
    const x = (inicio.x + fin.x) / 2
    return {
      puntos: [inicio, { x, y: inicio.y }, { x, y: fin.y }, fin],
      etiqueta: { x, y: (inicio.y + fin.y) / 2 },
    }
  }
  const nivel = Math.max(de.y, a.y) + m.alto + codo
  const sale = { x: inicio.x + codo, y: nivel }
  const llega = { x: fin.x - codo, y: nivel }
  return {
    puntos: [inicio, { x: sale.x, y: inicio.y }, sale, llega, { x: llega.x, y: fin.y }, fin],
    etiqueta: medio(sale, llega),
  }
}

// Un arco: sube (o baja) desde su puerto, cruza por encima (o por debajo) de las dos cajas en su carril y baja (o sube) al puerto de llegada.
function arco(de: Punto, a: Punto, ruta: RutaDeSalida, m: MedidasDelDiagrama): TrazoDeSalida {
  const arriba = ruta.lado !== 'abajo'
  const nivel = arriba
    ? Math.min(de.y, a.y) - ruta.carril * m.carril
    : Math.max(de.y, a.y) + m.alto + ruta.carril * m.carril
  const xDe = de.x + ruta.puertoDe
  const xA = a.x + ruta.puertoA
  const bordeDe = arriba ? de.y : de.y + m.alto
  const bordeA = arriba ? a.y : a.y + m.alto
  return {
    puntos: [
      { x: xDe, y: bordeDe },
      { x: xDe, y: nivel },
      { x: xA, y: nivel },
      { x: xA, y: bordeA },
    ],
    etiqueta: { x: (xDe + xA) / 2, y: nivel },
  }
}

// `de` y `a`: la esquina de arriba a la izquierda de cada caja.
export function trazarSalida(
  de: Punto,
  a: Punto,
  ruta: RutaDeSalida,
  m: MedidasDelDiagrama,
): TrazoDeSalida {
  return ruta.forma === 'recta' ? recta(de, a, m) : arco(de, a, ruta, m)
}

export type LimitesDelDibujo = { x: number; y: number; ancho: number; alto: number }

// Lo que ocupa el dibujo (cajas y flechas) con su margen alrededor: no empieza en 0 si una fase quedó a la izquierda o arriba del principio.
export function limitesDelDibujo(
  cajas: readonly Punto[],
  trazos: readonly TrazoDeSalida[],
  m: MedidasDelDiagrama,
): LimitesDelDibujo {
  if (cajas.length === 0) {
    return { x: 0, y: 0, ancho: 2 * m.margen, alto: 2 * m.margen }
  }
  const xs = cajas.flatMap((c) => [c.x, c.x + m.ancho])
  const ys = cajas.flatMap((c) => [c.y, c.y + m.alto])
  for (const trazo of trazos) {
    for (const p of trazo.puntos) {
      xs.push(p.x)
      ys.push(p.y)
    }
  }
  const x = Math.min(...xs) - m.margen
  const y = Math.min(...ys) - m.margen
  return { x, y, ancho: Math.max(...xs) + m.margen - x, alto: Math.max(...ys) + m.margen - y }
}

// La disposición con cada caja donde está (`cajas`, px; la que no figura queda donde la puso el acomodo): las flechas trazadas otra vez por su ruta y
// los límites del dibujo. Sin cajas movidas da la misma disposición.
export function disponerConPosiciones(
  auto: DisposicionDelDiagrama,
  cajas: ReadonlyMap<string, Punto>,
): DisposicionDelDiagrama {
  const nodos = auto.nodos.map((n) => {
    const caja = cajas.get(n.id)
    return caja ? { ...n, x: caja.x, y: caja.y } : n
  })
  const porId = new Map(nodos.map((n) => [n.id, n]))
  const flechas = auto.flechas.flatMap((f) => {
    const de = porId.get(f.de)
    const a = porId.get(f.a)
    if (!de || !a) return []
    return [{ ...f, ...trazarSalida(de, a, f.ruta, auto.medidas) }]
  })
  const limites = limitesDelDibujo(nodos, flechas, auto.medidas)
  return {
    nodos,
    flechas,
    ancho: limites.ancho,
    alto: limites.alto,
    limites,
    medidas: auto.medidas,
  }
}
