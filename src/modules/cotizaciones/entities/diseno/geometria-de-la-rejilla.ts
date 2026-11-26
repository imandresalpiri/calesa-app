// La geometría de una rejilla del lienzo del editor de la hoja, para saber sobre qué celda cae lo que se arrastra y dónde dibujar la marca
// (docs/DECISIONES.md › «La hoja en una rejilla libre»). Se mide del navegador (`use-geometria-de-la-rejilla.ts`: las pistas de
// `grid-template-columns/rows`, los huecos y el relleno) y llega en los px de la propia rejilla: el punto de la pantalla ya viene dividido por la escala
// del lienzo (`zoom`), así la marca se dibuja con esas mismas medidas. Puras.
import { MAXIMO_DE_FILAS, type Posicion } from '../rejilla-de-la-hoja'
import type { Tamano } from './lugar-en-la-rejilla'

export type GeometriaDeLaRejilla = {
  // Dónde empieza la primera pista, desde el borde de relleno de la rejilla.
  izquierda: number
  arriba: number
  // El ancho de cada columna y el alto de cada fila medida.
  columnas: readonly number[]
  filas: readonly number[]
  huecoX: number
  huecoY: number
  // Lo que mide una fila que todavía no existe (debajo de la última): la de una fila vacía.
  altoDeUnaFilaNueva: number
}

export type Punto = { x: number; y: number }
export type Rectangulo = { izquierda: number; arriba: number; ancho: number; alto: number }

// Un eje de la rejilla: sus pistas medidas, su hueco y lo que mide una pista que no se midió.
type Eje = { pistas: readonly number[]; hueco: number; nueva: number }

const columnasDe = (g: GeometriaDeLaRejilla): Eje => ({
  pistas: g.columnas,
  hueco: g.huecoX,
  nueva: g.columnas.at(-1) ?? 0,
})
const filasDe = (g: GeometriaDeLaRejilla): Eje => ({
  pistas: g.filas,
  hueco: g.huecoY,
  nueva: g.altoDeUnaFilaNueva,
})
const pista = (eje: Eje, i: number) => eje.pistas[i - 1] ?? eje.nueva

// Dónde empieza la pista `indice` (desde 1), desde la primera.
function inicioDe(eje: Eje, indice: number) {
  let inicio = 0
  for (let i = 1; i < indice; i++) inicio += pista(eje, i) + eje.hueco
  return inicio
}

// La pista (desde 1) en que cae `x`: la mitad de cada hueco es de la pista de cada lado; antes de la primera, la primera; acotada a `maximo`.
function pistaEn(x: number, eje: Eje, maximo: number) {
  let fin = 0
  for (let i = 1; i < maximo; i++) {
    fin += pista(eje, i)
    if (x < fin + eje.hueco / 2) return i
    fin += eje.hueco
  }
  return maximo
}

// El largo de `n` pistas desde la `desde`, con los huecos de entre ellas.
function largo(eje: Eje, desde: number, n: number) {
  let total = 0
  for (let i = desde; i < desde + n; i++) total += pista(eje, i)
  return total + eje.hueco * Math.max(0, n - 1)
}

// La celda bajo un punto (en px de la rejilla): la columna de 1 a 12 y la fila hasta `filaMaxima` (la siguiente a la última ocupada: soltar debajo de
// todo crea esa fila).
export function celdaBajo(punto: Punto, g: GeometriaDeLaRejilla, filaMaxima: number): Posicion {
  return {
    columna: pistaEn(punto.x - g.izquierda, columnasDe(g), Math.max(1, g.columnas.length)),
    fila: pistaEn(punto.y - g.arriba, filasDe(g), Math.max(1, filaMaxima)),
  }
}

// El recuadro de la marca: el área que ocuparía la pieza en `destino`, en px de la rejilla (lo que no entra en las 12 columnas se corta en el borde).
export function rectanguloDeLaMarca(
  destino: Posicion,
  tamano: Tamano,
  g: GeometriaDeLaRejilla,
): Rectangulo {
  const columnas = Math.max(1, Math.min(tamano.ancho, g.columnas.length - destino.columna + 1))
  return {
    izquierda: g.izquierda + inicioDe(columnasDe(g), destino.columna),
    arriba: g.arriba + inicioDe(filasDe(g), destino.fila),
    ancho: largo(columnasDe(g), destino.columna, columnas),
    alto: largo(filasDe(g), destino.fila, tamano.alto),
  }
}

// Cuántas filas pide el borde inferior llevado a `y` (en px de la rejilla) por una pieza que empieza en `filaDeInicio`: de 1 a 4 (`MAXIMO_DE_FILAS`;
// lo que de verdad entra lo decide `tamanoQueEntra()`).
export function filasPorBorde(y: number, g: GeometriaDeLaRejilla, filaDeInicio: number): number {
  const filas = filasDe(g)
  const desde = g.arriba + inicioDe(filas, filaDeInicio)
  const desdeSuFila = { ...filas, pistas: filas.pistas.slice(filaDeInicio - 1) }
  return Math.max(1, Math.min(MAXIMO_DE_FILAS, pistaEn(y - desde, desdeSuFila, MAXIMO_DE_FILAS)))
}
