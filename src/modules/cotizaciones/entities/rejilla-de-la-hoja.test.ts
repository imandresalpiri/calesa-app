import { describe, expect, it } from 'vitest'
import {
  ALTO_DE_UNA_FILA_VACIA,
  altoSirve,
  ANCHO_MINIMO_DE_UNA_PIEZA,
  colocarEnFlujo,
  COLUMNAS_DE_CADA_ANCHO,
  columnasDeLaCelda,
  corteDe,
  corteDeLaRejilla,
  CORTES,
  enOrdenDeLectura,
  pistasDeLasFilas,
  sePisan,
  ultimaFila,
} from './rejilla-de-la-hoja'

describe('la rejilla de la hoja', () => {
  it('completo, mitad y tercio son 12, 6 y 4 columnas; un número es su número', () => {
    expect(columnasDeLaCelda('completo')).toBe(12)
    expect(columnasDeLaCelda('mitad')).toBe(6)
    expect(columnasDeLaCelda('tercio')).toBe(4)
    expect(columnasDeLaCelda(8)).toBe(8)
    expect(COLUMNAS_DE_CADA_ANCHO).toEqual({ completo: 12, mitad: 6, tercio: 4 })
  })

  it('el corte de cada ancho: el primero que le da 16 rem (mitad desde 32 y tercio desde 48, como siempre)', () => {
    const cortes = Array.from({ length: 12 }, (_, i) => corteDe(i + 1))
    expect(cortes).toEqual([
      '7xl',
      '7xl',
      '5xl',
      '3xl',
      '2xl',
      'lg',
      'lg',
      'lg',
      'lg',
      'lg',
      'lg',
      'siempre',
    ])
    for (let n = 3; n < 12; n++) {
      const corte = corteDe(n)
      if (corte === 'siempre') continue
      expect((CORTES[corte] * n) / 12).toBeGreaterThanOrEqual(ANCHO_MINIMO_DE_UNA_PIEZA)
    }
  })

  it('el alto sólo sirve si la pieza no ocupa la fila entera', () => {
    expect(altoSirve(12)).toBe(false)
    expect(altoSirve(11)).toBe(true)
    expect(altoSirve(1)).toBe(true)
  })
})

describe('la rejilla libre', () => {
  it('colocarEnFlujo: lo que no cabe baja, el hueco detrás de una alta queda y 12 columnas ocupan la fila', () => {
    expect(
      colocarEnFlujo([
        { ancho: 8, alto: 1 },
        { ancho: 6, alto: 1 },
      ]),
    ).toEqual([
      { columna: 1, fila: 1 },
      { columna: 1, fila: 2 },
    ])
    // La alta ocupa las filas 1 a 4 en las columnas 1 a 6: la de 6 va al lado y la siguiente, debajo de esa (el cursor no vuelve atrás).
    expect(
      colocarEnFlujo([
        { ancho: 6, alto: 4 },
        { ancho: 6, alto: 1 },
        { ancho: 6, alto: 1 },
        { ancho: 12, alto: 1 },
      ]),
    ).toEqual([
      { columna: 1, fila: 1 },
      { columna: 7, fila: 1 },
      { columna: 7, fila: 2 },
      { columna: 1, fila: 5 },
    ])
  })

  it('enOrdenDeLectura: por fila y columna, estable; sin una posición, la lista como vino', () => {
    const p = (id: string, columna: number, fila: number) => ({ id, posicion: { columna, fila } })
    const lista = [p('c', 1, 2), p('b', 7, 1), p('a', 1, 1), p('d', 1, 2)]
    expect(enOrdenDeLectura(lista, (x) => x.posicion).map((x) => x.id)).toEqual([
      'a',
      'b',
      'c',
      'd',
    ])
    const sinUna = [p('b', 7, 1), { id: 'x', posicion: undefined }, p('a', 1, 1)]
    expect(enOrdenDeLectura(sinUna, (x) => x.posicion).map((x) => x.id)).toEqual(['b', 'x', 'a'])
  })

  it('corteDeLaRejilla: el más exigente de sus piezas; sin piezas o todas de 12, siempre', () => {
    expect(corteDeLaRejilla(['lg', '5xl', 'siempre'])).toBe('5xl')
    expect(corteDeLaRejilla([corteDe(12), corteDe(12)])).toBe('siempre')
    expect(corteDeLaRejilla([])).toBe('siempre')
  })

  it('pistasDeLasFilas: auto lo ocupado, una fila vacía con su alto y las corridas largas con repeat()', () => {
    const pieza = (fila: number, alto = 1) => ({ posicion: { columna: 1, fila }, ancho: 6, alto })
    expect(pistasDeLasFilas([pieza(1), pieza(3)])).toBe(`auto ${ALTO_DE_UNA_FILA_VACIA} auto`)
    expect(pistasDeLasFilas([pieza(1, 4)], 1)).toBe(`repeat(4,auto) ${ALTO_DE_UNA_FILA_VACIA}`)
    expect(pistasDeLasFilas([])).toBe('')
    expect(ultimaFila([pieza(2, 3), pieza(1)])).toBe(4)
  })

  it('sePisan: comparten alguna celda; tocarse por el borde no es pisarse', () => {
    const pieza = (columna: number, fila: number, ancho: number, alto = 1) => ({
      posicion: { columna, fila },
      ancho,
      alto,
    })
    expect(sePisan(pieza(1, 1, 6), pieza(6, 1, 2))).toBe(true)
    expect(sePisan(pieza(1, 1, 6), pieza(7, 1, 6))).toBe(false)
    expect(sePisan(pieza(1, 1, 6, 2), pieza(3, 2, 2))).toBe(true)
    expect(sePisan(pieza(1, 1, 6, 2), pieza(1, 3, 12))).toBe(false)
  })
})
