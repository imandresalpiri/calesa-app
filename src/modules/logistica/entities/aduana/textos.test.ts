import { describe, expect, it } from 'vitest'
import { vehiculosDeLaFila } from './textos'

const v = (...titulos: string[]) => titulos.map((titulo, i) => ({ vehiculoId: `id-${i}`, titulo }))

describe('los vehículos de una fila de Aduana', () => {
  it('nombra uno, dos o tres', () => {
    expect(vehiculosDeLaFila(v('Hilux'), 1)).toBe('Hilux')
    expect(vehiculosDeLaFila(v('Hilux', 'Ranger'), 2)).toBe('Hilux y Ranger')
    expect(vehiculosDeLaFila(v('Hilux', 'Ranger', 'Tacoma'), 3)).toBe('Hilux, Ranger y Tacoma')
  })

  it('con más de tres, dice cuántos más', () => {
    expect(vehiculosDeLaFila(v('Hilux', 'Ranger', 'Tacoma'), 6)).toBe(
      'Hilux, Ranger, Tacoma y 3 más',
    )
  })

  it('lo que queda sin nombrar no es un total exacto: hasta «100+»', () => {
    expect(vehiculosDeLaFila(v('A', 'B', 'C'), 103)).toBe('A, B, C y 100 más')
    expect(vehiculosDeLaFila(v('A', 'B', 'C'), 201)).toBe('A, B, C y 100+ más')
  })

  it('los ocultos se dicen sin nombrarlos', () => {
    expect(vehiculosDeLaFila(v('Hilux'), 1, true)).toBe('Hilux, y otros que no puedes ver')
    expect(vehiculosDeLaFila([], 0, true)).toBe('Otros que no puedes ver')
    expect(vehiculosDeLaFila([], 0)).toBe('')
  })
})
