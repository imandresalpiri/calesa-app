import { describe, expect, it } from 'vitest'
import { celda, disenoDe, seccion } from './diseno-de-prueba.soporte'
import {
  claveDeLaUbicacion,
  mismaPieza,
  piezaDelItemDeLaHoja,
  piezaDelTexto,
  textoDeLaPieza,
  ubicarLaPieza,
  type PiezaDeLaHoja,
} from './pieza-de-la-hoja'

const PIEZAS: PiezaDeLaHoja[] = [
  { pieza: 'nodo', nodo: 'remate' },
  { pieza: 'atajos', nodo: 'flete' },
  { pieza: 'seccion', seccion: 'compra' },
  { pieza: 'total' },
  { pieza: 'cabecera' },
]

describe('la pieza en la URL', () => {
  it('cada forma va y vuelve igual', () => {
    expect(PIEZAS.map(textoDeLaPieza)).toEqual([
      'remate',
      'atajos-flete',
      'seccion-compra',
      'tarjeta-del-total',
      'cabecera-de-la-hoja',
    ])
    for (const p of PIEZAS) expect(piezaDelTexto(textoDeLaPieza(p))).toEqual(p)
  })

  it('lo que no es una de las formas no elige nada', () => {
    for (const texto of [
      null,
      undefined,
      '',
      'Remate',
      'atajos-',
      'seccion-Compra',
      '1a',
      'a-b',
      'x'.repeat(42),
    ]) {
      expect(piezaDelTexto(texto)).toBeNull()
    }
  })

  it('la pieza de una clave', () => {
    expect(piezaDelItemDeLaHoja({ tipo: 'atajos', nodo: 'a' })).toEqual({
      pieza: 'atajos',
      nodo: 'a',
    })
    expect(piezaDelItemDeLaHoja({ tipo: 'subtotal', nodo: 'a' })).toEqual({
      pieza: 'nodo',
      nodo: 'a',
    })
    expect(piezaDelItemDeLaHoja({ tipo: 'total' })).toEqual({ pieza: 'total' })
  })

  it('compara por su texto', () => {
    expect(mismaPieza({ pieza: 'nodo', nodo: 'a' }, { pieza: 'nodo', nodo: 'a' })).toBe(true)
    expect(mismaPieza({ pieza: 'nodo', nodo: 'a' }, { pieza: 'atajos', nodo: 'a' })).toBe(false)
    expect(mismaPieza(null, null)).toBe(false)
  })
})

describe('dónde está la pieza elegida', () => {
  const d = disenoDe([
    seccion('uno', [celda('a'), { tipo: 'atajos', nodo: 'a', columna: 'x', filas: 2 }]),
    seccion('dos', [celda('b'), { tipo: 'total' }, celda('a')]),
  ])

  it('la primera aparición, con su clave; los atajos no son la celda de su nodo', () => {
    const celdaA = ubicarLaPieza(d, { pieza: 'nodo', nodo: 'a' })
    expect(celdaA && { seccion: celdaA.seccion.id, indice: celdaA.indice }).toEqual({
      seccion: 'uno',
      indice: 0,
    })
    const atajos = ubicarLaPieza(d, { pieza: 'atajos', nodo: 'a' })
    expect(atajos && claveDeLaUbicacion(atajos)).toEqual({
      seccion: 'uno',
      tipo: 'atajos',
      nodo: 'a',
    })
    const total = ubicarLaPieza(d, { pieza: 'total' })
    expect(total && claveDeLaUbicacion(total)).toEqual({ seccion: 'dos', tipo: 'total' })
  })

  it('una sección, la cabecera o lo que ya no está no se ubican', () => {
    expect(ubicarLaPieza(d, { pieza: 'seccion', seccion: 'uno' })).toBeNull()
    expect(ubicarLaPieza(d, { pieza: 'cabecera' })).toBeNull()
    expect(ubicarLaPieza(d, { pieza: 'nodo', nodo: 'zz' })).toBeNull()
  })
})
