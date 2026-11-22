import { describe, expect, it } from 'vitest'
import { camposQueCoinciden, coincide } from './buscar'

describe('coincide', () => {
  it('compara sin tildes ni mayúsculas', () => {
    expect(coincide('Color', 'colór')).toBe(true)
    expect(coincide('Año de fabricación', 'ANO')).toBe(true)
    expect(coincide('Tracción', 'traccion')).toBe(true)
  })

  it('una consulta vacía o de espacios coincide con todo', () => {
    expect(coincide('Color', '')).toBe(true)
    expect(coincide('Color', '   ')).toBe(true)
  })

  it('recorta los espacios de lo buscado y no encuentra lo que no está', () => {
    expect(coincide('Color', '  col ')).toBe(true)
    expect(coincide('Color', 'motor')).toBe(false)
  })
})

describe('camposQueCoinciden', () => {
  it('deja los que coinciden, en su orden', () => {
    const campos = [{ etiqueta: 'Color' }, { etiqueta: 'Motor' }, { etiqueta: 'Color interior' }]
    expect(camposQueCoinciden(campos, 'color')).toEqual([
      { etiqueta: 'Color' },
      { etiqueta: 'Color interior' },
    ])
  })

  it('con 200 campos filtra sin perder ninguno que coincide', () => {
    const campos = Array.from({ length: 200 }, (_, n) => ({ etiqueta: `Dato ${String(n)}` }))
    expect(camposQueCoinciden(campos, 'dato 1')).toHaveLength(111)
    expect(camposQueCoinciden(campos, '')).toHaveLength(200)
  })
})
