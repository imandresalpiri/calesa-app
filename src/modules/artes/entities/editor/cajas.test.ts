import { describe, expect, it } from 'vitest'
import { cajaDe, centro, contiene, seCruzan, union } from './cajas'

const capa = { x: 100, y: 50, ancho: 200, alto: 100, rotacion: 0 }

describe('la caja de una capa', () => {
  it('sin rotación es la misma caja', () => {
    expect(cajaDe(capa)).toEqual({ x: 100, y: 50, ancho: 200, alto: 100 })
  })

  it('a 90° cambia ancho por alto alrededor del centro', () => {
    const caja = cajaDe({ ...capa, rotacion: 90 })
    expect(caja.x).toBeCloseTo(150)
    expect(caja.y).toBeCloseTo(0)
    expect(caja.ancho).toBeCloseTo(100)
    expect(caja.alto).toBeCloseTo(200)
    expect(centro(caja).x).toBeCloseTo(200)
    expect(centro(caja).y).toBeCloseTo(100)
  })

  it('a 45° encierra las cuatro esquinas', () => {
    const caja = cajaDe({ x: 0, y: 0, ancho: 100, alto: 100, rotacion: 45 })
    const lado = 100 * Math.SQRT2
    expect(caja.ancho).toBeCloseTo(lado)
    expect(caja.alto).toBeCloseTo(lado)
    expect(caja.x).toBeCloseTo(50 - lado / 2)
    expect(caja.y).toBeCloseTo(50 - lado / 2)
  })

  it('a 180° y a -360° vuelve a la misma', () => {
    const media = cajaDe({ ...capa, rotacion: 180 })
    expect(media.x).toBeCloseTo(100)
    expect(media.ancho).toBeCloseTo(200)
    expect(cajaDe({ ...capa, rotacion: -360 })).toEqual({ x: 100, y: 50, ancho: 200, alto: 100 })
  })
})

describe('varias cajas', () => {
  const a = { x: 0, y: 0, ancho: 10, alto: 10 }
  const b = { x: 20, y: 5, ancho: 10, alto: 30 }

  it('la unión encierra a todas, y sin ninguna es nula', () => {
    expect(union([a, b])).toEqual({ x: 0, y: 0, ancho: 30, alto: 35 })
    expect(union([a])).toEqual(a)
    expect(union([])).toBeNull()
  })

  it('se cruzan si se pisan o se tocan por el borde', () => {
    expect(seCruzan(a, b)).toBe(false)
    expect(seCruzan(a, { x: 5, y: 5, ancho: 10, alto: 10 })).toBe(true)
    expect(seCruzan(a, { x: 10, y: 0, ancho: 5, alto: 5 })).toBe(true)
    expect(seCruzan(a, { x: 10.01, y: 0, ancho: 5, alto: 5 })).toBe(false)
  })

  it('contiene un punto de adentro o del borde', () => {
    expect(contiene(a, { x: 5, y: 5 })).toBe(true)
    expect(contiene(a, { x: 10, y: 0 })).toBe(true)
    expect(contiene(a, { x: 11, y: 5 })).toBe(false)
  })
})
