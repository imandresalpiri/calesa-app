// Los trazos de la pluma del editor de artes (docs/GLOSARIO.md › «Trazo»): nodos con curvas Bézier cúbicas. Cada nodo lleva sus asas de
// entrada y salida (nula: el tramo llega o sale recto), todo relativo a la esquina de la caja de la capa. Arma el `data` de `Konva.Path`, la
// caja que encierra la curva de verdad y las ediciones (agregar, mover y quitar nodos, mover asas, cerrar). Puro.
import { MAXIMO_DE_NODOS_POR_TRAZO, type CapaDe, type NodoDelTrazo, type Punto } from '../documento'
import type { Caja } from './cajas'

type Tramo = { p0: Punto; p1: Punto; p2: Punto; p3: Punto; recto: boolean }

const MUESTRAS_POR_TRAMO = 24
const MUESTRAS_DEL_REFINAMIENTO = 16
const CASI_CERO = 1e-9

const punto = (p: Punto): Punto => ({ x: p.x, y: p.y })
const mezcla = (a: Punto, b: Punto, t: number): Punto => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
})
const distancia = (a: Punto, b: Punto): number => Math.hypot(a.x - b.x, a.y - b.y)

function tramoEntre(a: NodoDelTrazo, b: NodoDelTrazo): Tramo {
  return {
    p0: punto(a),
    p1: a.salida ?? punto(a),
    p2: b.entrada ?? punto(b),
    p3: punto(b),
    recto: a.salida === null && b.entrada === null,
  }
}

// Los tramos en orden; un trazo cerrado suma el del último nodo al primero.
function tramosDe(nodos: readonly NodoDelTrazo[], cerrado: boolean): Tramo[] {
  const tramos: Tramo[] = []
  for (let i = 0; i < nodos.length - 1; i += 1) {
    const a = nodos[i]
    const b = nodos[i + 1]
    if (a && b) {
      tramos.push(tramoEntre(a, b))
    }
  }
  const ultimo = nodos.at(-1)
  const primero = nodos[0]
  if (cerrado && nodos.length > 2 && ultimo && primero) {
    tramos.push(tramoEntre(ultimo, primero))
  }
  return tramos
}

// Un tramo recto se recorre en línea (así `t` es la fracción del largo); uno curvo, por su cúbica.
function puntoDe(tramo: Tramo, t: number): Punto {
  if (tramo.recto) {
    return mezcla(tramo.p0, tramo.p3, t)
  }
  const u = 1 - t
  const a = u * u * u
  const b = 3 * u * u * t
  const c = 3 * u * t * t
  const d = t * t * t
  return {
    x: a * tramo.p0.x + b * tramo.p1.x + c * tramo.p2.x + d * tramo.p3.x,
    y: a * tramo.p0.y + b * tramo.p1.y + c * tramo.p2.y + d * tramo.p3.y,
  }
}

// El punto de la curva en el tramo `segmento`, en `t` (de 0 a 1); nulo si el tramo no existe.
export function puntoDelTrazo(
  nodos: readonly NodoDelTrazo[],
  cerrado: boolean,
  segmento: number,
  t: number,
): Punto | null {
  const tramo = tramosDe(nodos, cerrado)[segmento]
  return tramo ? puntoDe(tramo, t) : null
}

const numero = (n: number): string => {
  const redondo = Math.round(n * 100) / 100
  return String(redondo === 0 ? 0 : redondo)
}
const par = (p: Punto) => `${numero(p.x)} ${numero(p.y)}`

// El `data` de `Konva.Path` (SVG): `M` al primer nodo, `L` o `C` por tramo y `Z` si está cerrado.
export function datosDelTrazo(nodos: readonly NodoDelTrazo[], cerrado: boolean): string {
  const primero = nodos[0]
  if (!primero) {
    return ''
  }
  const partes = [`M ${par(primero)}`]
  for (const tramo of tramosDe(nodos, cerrado)) {
    partes.push(
      tramo.recto ? `L ${par(tramo.p3)}` : `C ${par(tramo.p1)} ${par(tramo.p2)} ${par(tramo.p3)}`,
    )
  }
  if (cerrado && nodos.length > 2) {
    partes.push('Z')
  }
  return partes.join(' ')
}

// Los t de (0, 1) donde la derivada de un eje de la cúbica se anula: ahí están sus extremos.
function extremos(a: number, b: number, c: number, d: number): number[] {
  const qa = 3 * (-a + 3 * b - 3 * c + d)
  const qb = 6 * (a - 2 * b + c)
  const qc = 3 * (b - a)
  const raices: number[] = []
  if (Math.abs(qa) < CASI_CERO) {
    if (Math.abs(qb) > CASI_CERO) {
      raices.push(-qc / qb)
    }
  } else {
    const discriminante = qb * qb - 4 * qa * qc
    if (discriminante >= 0) {
      const raiz = Math.sqrt(discriminante)
      raices.push((-qb + raiz) / (2 * qa), (-qb - raiz) / (2 * qa))
    }
  }
  return raices.filter((t) => t > 0 && t < 1)
}

// La caja que encierra la curva de verdad: los nodos y los extremos de cada tramo (no las asas, que pueden quedar afuera).
export function cajaDelTrazo(nodos: readonly NodoDelTrazo[], cerrado: boolean): Caja {
  const puntos: Punto[] = nodos.map(punto)
  for (const tramo of tramosDe(nodos, cerrado)) {
    const ts = [
      ...extremos(tramo.p0.x, tramo.p1.x, tramo.p2.x, tramo.p3.x),
      ...extremos(tramo.p0.y, tramo.p1.y, tramo.p2.y, tramo.p3.y),
    ]
    puntos.push(...ts.map((t) => puntoDe(tramo, t)))
  }
  if (puntos.length === 0) {
    return { x: 0, y: 0, ancho: 0, alto: 0 }
  }
  const xs = puntos.map((p) => p.x)
  const ys = puntos.map((p) => p.y)
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return { x, y, ancho: Math.max(...xs) - x, alto: Math.max(...ys) - y }
}

function correrNodo(nodo: NodoDelTrazo, dx: number, dy: number): NodoDelTrazo {
  const correr = (p: Punto | null) => (p ? { x: p.x + dx, y: p.y + dy } : null)
  return {
    x: nodo.x + dx,
    y: nodo.y + dy,
    entrada: correr(nodo.entrada),
    salida: correr(nodo.salida),
  }
}

// Rehace la caja para que encierre la curva y deja los nodos relativos a su nueva esquina, sin mover el trazo en el documento. Con rotación
// no normaliza (correr la caja movería el centro de giro): conserva la caja que tiene.
export function normalizar(capa: CapaDe<'trazo'>): CapaDe<'trazo'> {
  if (capa.rotacion !== 0) {
    return capa
  }
  const caja = cajaDelTrazo(capa.nodos, capa.cerrado)
  if (caja.x === 0 && caja.y === 0 && caja.ancho === capa.ancho && caja.alto === capa.alto) {
    return capa
  }
  return {
    ...capa,
    x: capa.x + caja.x,
    y: capa.y + caja.y,
    ancho: caja.ancho,
    alto: caja.alto,
    nodos: capa.nodos.map((n) => correrNodo(n, -caja.x, -caja.y)),
  }
}

// Cierra el trazo (el clic en el primer nodo) y rehace su caja.
export function cerrar(capa: CapaDe<'trazo'>): CapaDe<'trazo'> {
  return capa.cerrado || capa.nodos.length < 3 ? capa : normalizar({ ...capa, cerrado: true })
}

// Si un punto cae sobre el primer nodo (para cerrar el trazo con un clic).
export function tocaElPrimero(nodos: readonly NodoDelTrazo[], p: Punto, radio: number): boolean {
  const primero = nodos[0]
  return nodos.length > 2 && primero !== undefined && distancia(primero, p) <= radio
}

// Cuando las asas del Transformer cambian el ancho y el alto de la caja: los nodos y sus asas escalan con ella.
export function escalarNodos(
  nodos: readonly NodoDelTrazo[],
  sx: number,
  sy: number,
): NodoDelTrazo[] {
  const escalar = (p: Punto | null) => (p ? { x: p.x * sx, y: p.y * sy } : null)
  return nodos.map((n) => ({
    x: n.x * sx,
    y: n.y * sy,
    entrada: escalar(n.entrada),
    salida: escalar(n.salida),
  }))
}

// Parte el tramo `segmento` en `t` por de Casteljau: la curva no cambia de forma. Un tramo recto suma un nodo recto.
export function agregarNodo(
  nodos: readonly NodoDelTrazo[],
  cerrado: boolean,
  segmento: number,
  t: number,
): NodoDelTrazo[] {
  const tramo = tramosDe(nodos, cerrado)[segmento]
  const siguiente = (segmento + 1) % nodos.length
  const a = nodos[segmento]
  const b = nodos[siguiente]
  if (!tramo || !a || !b || nodos.length >= MAXIMO_DE_NODOS_POR_TRAZO) {
    return [...nodos]
  }
  const q0 = mezcla(tramo.p0, tramo.p1, t)
  const q1 = mezcla(tramo.p1, tramo.p2, t)
  const q2 = mezcla(tramo.p2, tramo.p3, t)
  const r0 = mezcla(q0, q1, t)
  const r1 = mezcla(q1, q2, t)
  const medio = mezcla(r0, r1, t)
  const nuevo: NodoDelTrazo = tramo.recto
    ? { ...puntoDe(tramo, t), entrada: null, salida: null }
    : { ...medio, entrada: r0, salida: r1 }
  const salida = nodos.map((n, i) => {
    if (tramo.recto) {
      return n
    }
    if (i === segmento) {
      return { ...n, salida: q0 }
    }
    return i === siguiente ? { ...n, entrada: q2 } : n
  })
  salida.splice(segmento + 1, 0, nuevo)
  return salida
}

// Mueve el nodo `i` con sus asas.
export function moverNodo(nodos: readonly NodoDelTrazo[], i: number, p: Punto): NodoDelTrazo[] {
  return nodos.map((n, j) => (j === i ? correrNodo(n, p.x - n.x, p.y - n.y) : n))
}

// Mueve un asa del nodo `i`. Simétrica, la otra queda reflejada alrededor del nodo; con Alt (no simétrica), sólo esa.
export function moverAsa(
  nodos: readonly NodoDelTrazo[],
  i: number,
  asa: { lado: 'entrada' | 'salida'; punto: Punto },
  simetrica: boolean,
): NodoDelTrazo[] {
  const otro = asa.lado === 'entrada' ? 'salida' : 'entrada'
  return nodos.map((n, j) => {
    if (j !== i) {
      return n
    }
    const reflejo = { x: 2 * n.x - asa.punto.x, y: 2 * n.y - asa.punto.y }
    return { ...n, [asa.lado]: punto(asa.punto), ...(simetrica ? { [otro]: reflejo } : {}) }
  })
}

// Quita el nodo `i`. Un trazo no baja de 2 nodos: con 2, devuelve el mismo arreglo.
export function quitarNodo(nodos: NodoDelTrazo[], i: number): NodoDelTrazo[] {
  if (nodos.length <= 2 || i < 0 || i >= nodos.length) {
    return nodos
  }
  return nodos.filter((_, j) => j !== i)
}

type Cercano = { segmento: number; t: number; distancia: number }

type Rango = { desde: number; hasta: number; pasos: number }

function mejorEn(tramo: Tramo, p: Punto, { desde, hasta, pasos }: Rango) {
  let mejor = { t: desde, distancia: Number.POSITIVE_INFINITY }
  for (let k = 0; k <= pasos; k += 1) {
    const t = desde + ((hasta - desde) * k) / pasos
    const d = distancia(puntoDe(tramo, t), p)
    if (d < mejor.distancia) {
      mejor = { t, distancia: d }
    }
  }
  return mejor
}

// El tramo y el `t` de la curva más cerca de un punto (el doble clic que agrega un nodo): por muestreo y un refinamiento alrededor del mejor.
export function segmentoMasCercano(
  nodos: readonly NodoDelTrazo[],
  cerrado: boolean,
  p: Punto,
): Cercano | null {
  let mejor: Cercano | null = null
  tramosDe(nodos, cerrado).forEach((tramo, segmento) => {
    const grueso = mejorEn(tramo, p, { desde: 0, hasta: 1, pasos: MUESTRAS_POR_TRAMO })
    const paso = 1 / MUESTRAS_POR_TRAMO
    const fino = mejorEn(tramo, p, {
      desde: Math.max(0, grueso.t - paso),
      hasta: Math.min(1, grueso.t + paso),
      pasos: MUESTRAS_DEL_REFINAMIENTO,
    })
    if (mejor === null || fino.distancia < mejor.distancia) {
      mejor = { segmento, ...fino }
    }
  })
  return mejor
}
