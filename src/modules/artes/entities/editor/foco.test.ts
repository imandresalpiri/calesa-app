import { describe, expect, it } from 'vitest'
import { dondeSeVeLaFoto, focoConFlecha, focoConPorCiento, focoEnElPunto } from './foco'

describe('dónde se ve la foto en la vista previa del foco', () => {
  it('una foto de 3 × 2 llena la vista', () => {
    expect(dondeSeVeLaFoto({ ancho: 1500, alto: 1000 })).toEqual({
      izquierda: 0,
      arriba: 0,
      ancho: 100,
      alto: 100,
    })
  })

  it('una foto alta queda entera y centrada, con aire a los lados', () => {
    expect(dondeSeVeLaFoto({ ancho: 1000, alto: 1000 })).toEqual({
      izquierda: expect.closeTo(16.667, 2) as number,
      arriba: 0,
      ancho: expect.closeTo(66.667, 2) as number,
      alto: 100,
    })
  })

  it('una foto ancha deja aire arriba y abajo', () => {
    expect(dondeSeVeLaFoto({ ancho: 1600, alto: 400 })).toEqual({
      izquierda: 0,
      arriba: 31.25,
      ancho: 100,
      alto: 37.5,
    })
  })

  it('sin medidas, la vista entera', () => {
    expect(dondeSeVeLaFoto(null)).toEqual({ izquierda: 0, arriba: 0, ancho: 100, alto: 100 })
  })
})

describe('el foco de un toque', () => {
  it('es la fracción de la foto donde se tocó, con tres decimales', () => {
    expect(focoEnElPunto({ x: 50, y: 25 }, { ancho: 200, alto: 100 })).toEqual({ x: 0.25, y: 0.25 })
    expect(focoEnElPunto({ x: 100, y: 100 }, { ancho: 300, alto: 300 })).toEqual({
      x: 0.333,
      y: 0.333,
    })
  })

  it('no sale de la foto', () => {
    expect(focoEnElPunto({ x: -10, y: 500 }, { ancho: 200, alto: 100 })).toEqual({ x: 0, y: 1 })
  })

  it('sin medidas, el centro', () => {
    expect(focoEnElPunto({ x: 10, y: 10 }, { ancho: 0, alto: 0 })).toEqual({ x: 0.5, y: 0.5 })
  })
})

describe('el foco con las flechas', () => {
  const centro = { x: 0.5, y: 0.5 }

  it('cada flecha lo corre de a 5 % (de a 1 % con Mayús)', () => {
    expect(focoConFlecha(centro, 'ArrowLeft', false)).toEqual({ x: 0.45, y: 0.5 })
    expect(focoConFlecha(centro, 'ArrowRight', false)).toEqual({ x: 0.55, y: 0.5 })
    expect(focoConFlecha(centro, 'ArrowUp', false)).toEqual({ x: 0.5, y: 0.45 })
    expect(focoConFlecha(centro, 'ArrowDown', true)).toEqual({ x: 0.5, y: 0.51 })
  })

  it('no pasa del borde', () => {
    expect(focoConFlecha({ x: 0.02, y: 0.99 }, 'ArrowLeft', false)).toEqual({ x: 0, y: 0.99 })
    expect(focoConFlecha({ x: 0.02, y: 0.99 }, 'ArrowDown', false)).toEqual({ x: 0.02, y: 1 })
  })

  it('otra tecla no lo cambia', () => {
    expect(focoConFlecha(centro, 'Enter', false)).toBeNull()
  })
})

describe('el foco escrito en por ciento', () => {
  it('cambia sólo su eje, acotado de 0 a 100', () => {
    expect(focoConPorCiento({ x: 0.5, y: 0.5 }, 'x', 30)).toEqual({ x: 0.3, y: 0.5 })
    expect(focoConPorCiento({ x: 0.5, y: 0.5 }, 'y', 140)).toEqual({ x: 0.5, y: 1 })
  })
})
