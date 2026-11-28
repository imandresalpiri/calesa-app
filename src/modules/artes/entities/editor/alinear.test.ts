import { describe, expect, it } from 'vitest'
import { alinear, distribuir, type Alineacion } from './alinear'

const DOCUMENTO = { ancho: 1000, alto: 800 }
const caja = { x: 100, y: 200, ancho: 50, alto: 40 }

describe('alinear una sola unidad contra el documento', () => {
  const casos: [Alineacion, { dx: number; dy: number }][] = [
    ['izquierda', { dx: -100, dy: 0 }],
    ['centro', { dx: 375, dy: 0 }],
    ['derecha', { dx: 850, dy: 0 }],
    ['arriba', { dx: 0, dy: -200 }],
    ['medio', { dx: 0, dy: 180 }],
    ['abajo', { dx: 0, dy: 560 }],
  ]
  it.each(casos)('%s', (como, esperado) => {
    expect(alinear([caja], como, DOCUMENTO)).toEqual([esperado])
  })
})

describe('alinear varias unidades contra la caja que las encierra', () => {
  const otra = { x: 300, y: 100, ancho: 100, alto: 200 }
  // La unión: x de 100 a 400, y de 100 a 300.
  const casos: [Alineacion, { dx: number; dy: number }[]][] = [
    [
      'izquierda',
      [
        { dx: 0, dy: 0 },
        { dx: -200, dy: 0 },
      ],
    ],
    [
      'centro',
      [
        { dx: 125, dy: 0 },
        { dx: -100, dy: 0 },
      ],
    ],
    [
      'derecha',
      [
        { dx: 250, dy: 0 },
        { dx: 0, dy: 0 },
      ],
    ],
    [
      'arriba',
      [
        { dx: 0, dy: -100 },
        { dx: 0, dy: 0 },
      ],
    ],
    [
      'medio',
      [
        { dx: 0, dy: -20 },
        { dx: 0, dy: 0 },
      ],
    ],
    [
      'abajo',
      [
        { dx: 0, dy: 60 },
        { dx: 0, dy: 0 },
      ],
    ],
  ]
  it.each(casos)('%s', (como, esperado) => {
    expect(alinear([caja, otra], como, DOCUMENTO)).toEqual(esperado)
  })

  it('sin unidades no hay nada que correr', () => {
    expect(alinear([], 'izquierda', DOCUMENTO)).toEqual([])
  })
})

describe('distribuir', () => {
  it('en horizontal deja los extremos quietos y los huecos iguales, en el orden de entrada', () => {
    const a = { x: 0, y: 0, ancho: 10, alto: 10 }
    const b = { x: 100, y: 0, ancho: 20, alto: 10 }
    const c = { x: 20, y: 0, ancho: 30, alto: 10 }
    // De 0 a 120, ocupan 60: dos huecos de 30. a en 0, c en 40, b en 100.
    expect(distribuir([b, a, c], 'horizontal')).toEqual([
      { dx: 0, dy: 0 },
      { dx: 0, dy: 0 },
      { dx: 20, dy: 0 },
    ])
  })

  it('en vertical', () => {
    const a = { x: 0, y: 0, ancho: 10, alto: 10 }
    const b = { x: 0, y: 15, ancho: 10, alto: 10 }
    const c = { x: 0, y: 90, ancho: 10, alto: 10 }
    expect(distribuir([a, b, c], 'vertical')).toEqual([
      { dx: 0, dy: 0 },
      { dx: 0, dy: 30 },
      { dx: 0, dy: 0 },
    ])
  })

  it('con menos de tres no mueve nada', () => {
    const a = { x: 0, y: 0, ancho: 10, alto: 10 }
    expect(distribuir([a, { ...a, x: 50 }], 'horizontal')).toEqual([
      { dx: 0, dy: 0 },
      { dx: 0, dy: 0 },
    ])
  })
})
