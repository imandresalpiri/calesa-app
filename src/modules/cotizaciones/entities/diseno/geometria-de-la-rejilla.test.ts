import { describe, expect, it } from 'vitest'
import {
  celdaBajo,
  filasPorBorde,
  rectanguloDeLaMarca,
  type GeometriaDeLaRejilla,
} from './geometria-de-la-rejilla'

// 12 columnas de 90 px con huecos de 10 (1.190 px), tres filas de 50, 40 y 60 con huecos de 20, y un relleno de 8 px.
const G: GeometriaDeLaRejilla = {
  izquierda: 8,
  arriba: 8,
  columnas: Array<number>(12).fill(90),
  filas: [50, 40, 60],
  huecoX: 10,
  huecoY: 20,
  altoDeUnaFilaNueva: 40,
}

describe('la celda bajo un punto', () => {
  it('cuenta columnas y filas con la mitad de cada hueco para cada lado', () => {
    expect(celdaBajo({ x: 8, y: 8 }, G, 4)).toEqual({ columna: 1, fila: 1 })
    // La columna 7 empieza en 8 + 6 × 100 = 608; la fila 2 en 8 + 70 = 78.
    expect(celdaBajo({ x: 610, y: 80 }, G, 4)).toEqual({ columna: 7, fila: 2 })
    // En la mitad izquierda del hueco entre la 1 y la 2, la 1; en la derecha, la 2.
    expect(celdaBajo({ x: 8 + 94, y: 8 }, G, 4).columna).toBe(1)
    expect(celdaBajo({ x: 8 + 96, y: 8 }, G, 4).columna).toBe(2)
  })

  it('antes del borde, la primera; más allá, la última columna y la fila máxima', () => {
    expect(celdaBajo({ x: -50, y: -50 }, G, 4)).toEqual({ columna: 1, fila: 1 })
    expect(celdaBajo({ x: 5000, y: 5000 }, G, 4)).toEqual({ columna: 12, fila: 4 })
    // Debajo de la última medida, las filas nuevas miden lo de una fila vacía: la 4 empieza en 8 + 210 = 218.
    expect(celdaBajo({ x: 8, y: 240 }, G, 6).fila).toBe(4)
    expect(celdaBajo({ x: 8, y: 240 + 60 }, G, 6).fila).toBe(5)
    expect(celdaBajo({ x: 8, y: 240 }, G, 3).fila).toBe(3)
  })
})

describe('la marca y el borde', () => {
  it('el recuadro de la pieza en su destino, cortado en el borde de las 12 columnas', () => {
    expect(rectanguloDeLaMarca({ columna: 7, fila: 2 }, { ancho: 6, alto: 2 }, G)).toEqual({
      izquierda: 608,
      arriba: 78,
      ancho: 6 * 90 + 5 * 10,
      alto: 40 + 20 + 60,
    })
    expect(rectanguloDeLaMarca({ columna: 10, fila: 4 }, { ancho: 6, alto: 1 }, G)).toEqual({
      izquierda: 908,
      arriba: 218,
      ancho: 3 * 90 + 2 * 10,
      alto: 40,
    })
  })

  it('el borde inferior pide las filas hasta donde se lleva, de 1 a 4', () => {
    // Una pieza en la fila 2 (empieza en 78, mide 40): hasta 108 sigue en una; en la 3 (desde 138), dos.
    expect(filasPorBorde(100, G, 2)).toBe(1)
    expect(filasPorBorde(140, G, 2)).toBe(2)
    expect(filasPorBorde(-100, G, 2)).toBe(1)
    expect(filasPorBorde(5000, G, 2)).toBe(4)
  })
})
