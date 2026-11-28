import { describe, expect, it } from 'vitest'
import { ajustar, umbralDeAjuste } from './guias'

const DOCUMENTO = { ancho: 1000, alto: 800 }

describe('el umbral de las guías', () => {
  it('son 6 px de pantalla: con zoom 2, 3 unidades del documento', () => {
    expect(umbralDeAjuste(1)).toBe(6)
    expect(umbralDeAjuste(2)).toBe(3)
    expect(umbralDeAjuste(0.5)).toBe(12)
  })
})

describe('ajustar al documento', () => {
  it('al borde izquierdo y al de arriba', () => {
    const { dx, dy, guias } = ajustar({ x: 4, y: -3, ancho: 100, alto: 50 }, [], DOCUMENTO, 6)
    expect(dx).toBe(-4)
    expect(dy).toBe(3)
    expect(guias).toContainEqual({ eje: 'x', posicion: 0, desde: 0, hasta: 800 })
    expect(guias).toContainEqual({ eje: 'y', posicion: 0, desde: 0, hasta: 1000 })
  })

  it('al centro del documento', () => {
    // El centro de la caja está en 498; el del documento, en 500.
    const { dx, guias } = ajustar({ x: 448, y: 300, ancho: 100, alto: 50 }, [], DOCUMENTO, 6)
    expect(dx).toBe(2)
    expect(guias.find((g) => g.eje === 'x')?.posicion).toBe(500)
  })

  it('fuera del umbral no ajusta ni dibuja guías', () => {
    expect(ajustar({ x: 20, y: 30, ancho: 100, alto: 50 }, [], DOCUMENTO, 6)).toEqual({
      dx: 0,
      dy: 0,
      guias: [],
    })
  })

  it('con más zoom el umbral es menor y lo que antes ajustaba ya no', () => {
    const caja = { x: 5, y: 300, ancho: 100, alto: 50 }
    expect(ajustar(caja, [], DOCUMENTO, umbralDeAjuste(1)).dx).toBe(-5)
    expect(ajustar(caja, [], DOCUMENTO, umbralDeAjuste(2)).dx).toBe(0)
  })
})

describe('ajustar a otra caja', () => {
  const otra = { x: 300, y: 100, ancho: 180, alto: 100 }

  it('el borde izquierdo con el borde derecho de la otra', () => {
    const { dx, guias } = ajustar({ x: 483, y: 400, ancho: 50, alto: 50 }, [otra], DOCUMENTO, 6)
    expect(dx).toBe(-3)
    // La línea abarca las dos cajas.
    expect(guias).toContainEqual({ eje: 'x', posicion: 480, desde: 100, hasta: 450 })
  })

  it('el centro con el centro de la otra', () => {
    // Centro de la otra: 390 × 150. Caja de 60 de ancho con su centro en 392.
    const { dx, guias } = ajustar({ x: 362, y: 600, ancho: 60, alto: 40 }, [otra], DOCUMENTO, 6)
    expect(dx).toBe(-2)
    expect(guias.some((g) => g.eje === 'x' && g.posicion === 390)).toBe(true)
  })

  it('elige el menor corrimiento y lo dice por eje', () => {
    const cerca = { x: 0, y: 0, ancho: 10, alto: 10 }
    const lejos = { x: 0, y: 0, ancho: 14, alto: 10 }
    const movida = { x: 11, y: 200, ancho: 30, alto: 30 }
    expect(ajustar(movida, [lejos, cerca], DOCUMENTO, 6).dx).toBe(-1)
  })

  it('ya alineada, corrimiento cero pero con su guía', () => {
    const { dx, guias } = ajustar({ x: 300, y: 500, ancho: 40, alto: 40 }, [otra], DOCUMENTO, 6)
    expect(dx).toBe(0)
    expect(guias.some((g) => g.eje === 'x' && g.posicion === 300)).toBe(true)
  })
})
