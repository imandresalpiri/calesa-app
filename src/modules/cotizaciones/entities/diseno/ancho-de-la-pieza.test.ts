import { describe, expect, it } from 'vitest'
import { celda, disenoDe, seccion } from './diseno-de-prueba.soporte'
import {
  acotarColumnas,
  columnasDe,
  columnasPorBorde,
  ponerColumnas,
  textoDeLasColumnas,
} from './ancho-de-la-pieza'

describe('el ancho de una pieza', () => {
  it('una celda lleva el suyo; lo demás sin ancho ocupa la fila', () => {
    expect(columnasDe(celda('a', { ancho: 4 }))).toBe(4)
    expect(columnasDe(celda('a'))).toBe(12)
    expect(columnasDe({ tipo: 'variante', nodo: 'variante' })).toBe(12)
    expect(columnasDe({ tipo: 'total', ancho: 5 })).toBe(5)
  })

  it('acota de 1 a 12 y redondea', () => {
    expect([0, 1, 6.4, 6.5, 13, -2].map(acotarColumnas)).toEqual([1, 1, 6, 7, 12, 1])
    expect(textoDeLasColumnas(6)).toBe('6/12')
  })

  it('pone las columnas que entran sin pisar a la vecina; en lo que no es celda, 12 quita la clave', () => {
    const d = disenoDe([seccion('s', [celda('a', { ancho: 6 }), { tipo: 'total', ancho: 4 }])])
    // «a» va en 1–6 y la tarjeta del total en 7–10: «a» se topa con ella y la tarjeta, con el borde.
    const celdaA = ponerColumnas(d, { seccion: 's', tipo: 'celda', nodo: 'a' }, 20)
    expect(celdaA.secciones[0]?.items[0]).toMatchObject({ ancho: 6 })
    const total = ponerColumnas(d, { seccion: 's', tipo: 'total' }, 12)
    expect(total.secciones[0]?.items[1]).toMatchObject({ ancho: 6 })
    const sola = disenoDe([
      seccion('s', [celda('a', { ancho: 6 }), celda('b'), { tipo: 'total', ancho: 4 }]),
    ])
    expect(
      ponerColumnas(sola, { seccion: 's', tipo: 'celda', nodo: 'a' }, 20).secciones[0]?.items[0],
    ).toMatchObject({ ancho: 12 })
    expect(ponerColumnas(sola, { seccion: 's', tipo: 'total' }, 12).secciones[0]?.items[2]).toEqual(
      {
        tipo: 'total',
        posicion: { columna: 1, fila: 3 },
      },
    )
  })

  it('el borde arrastrado da lo que mide desde el inicio de la pieza, en columnas de su rejilla', () => {
    expect(columnasPorBorde(300, 1200, 6)).toBe(3)
    expect(columnasPorBorde(1250, 1200, 6)).toBe(12)
    expect(columnasPorBorde(-40, 1200, 6)).toBe(1)
    expect(columnasPorBorde(300, 0, 6)).toBe(6)
    expect(columnasPorBorde(Number.NaN, 1200, 6)).toBe(6)
  })
})
