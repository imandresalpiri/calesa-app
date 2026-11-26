import { describe, expect, it } from 'vitest'
import { despuesDeAlMover, usosPorElemento } from './orden'

const lista = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]

describe('despuesDeAlMover', () => {
  it('subir deja el elemento detrás del que estaba dos lugares antes, o primero', () => {
    expect(despuesDeAlMover(lista, 'c', 'subir')).toBe('a')
    expect(despuesDeAlMover(lista, 'b', 'subir')).toBeNull()
  })

  it('bajar lo deja detrás del siguiente', () => {
    expect(despuesDeAlMover(lista, 'a', 'bajar')).toBe('b')
    expect(despuesDeAlMover(lista, 'b', 'bajar')).toBe('c')
  })

  it('el primero no sube, el último no baja y uno que no está no se mueve', () => {
    expect(despuesDeAlMover(lista, 'a', 'subir')).toBeUndefined()
    expect(despuesDeAlMover(lista, 'c', 'bajar')).toBeUndefined()
    expect(despuesDeAlMover(lista, 'x', 'bajar')).toBeUndefined()
  })
})

describe('usosPorElemento', () => {
  it('cuenta los ítems de cada elemento y salta los que no tienen', () => {
    const usos = usosPorElemento(
      [{ grupo: 'a' }, { grupo: null }, { grupo: 'a' }, { grupo: 'b' }],
      (item) => item.grupo,
    )
    expect([...usos]).toEqual([
      ['a', 2],
      ['b', 1],
    ])
  })
})
