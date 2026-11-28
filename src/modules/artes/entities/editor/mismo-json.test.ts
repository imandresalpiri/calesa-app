import { describe, expect, it } from 'vitest'
import { mismoJson } from './mismo-json'

describe('mismoJson', () => {
  it('no mira el orden de las claves', () => {
    expect(mismoJson({ a: 1, b: { c: [1, 2], d: 'x' } }, { b: { d: 'x', c: [1, 2] }, a: 1 })).toBe(
      true,
    )
  })

  it('el orden de un arreglo sí cuenta', () => {
    expect(mismoJson([1, 2], [2, 1])).toBe(false)
  })

  it('distingue valores y tipos', () => {
    expect(mismoJson({ a: 1 }, { a: '1' })).toBe(false)
    expect(mismoJson({ a: null }, { a: 0 })).toBe(false)
    expect(mismoJson({ a: 1 }, { a: 1, b: 2 })).toBe(false)
  })

  it('una clave con undefined es una clave ausente', () => {
    expect(mismoJson({ a: 1, b: undefined }, { a: 1 })).toBe(true)
  })
})
