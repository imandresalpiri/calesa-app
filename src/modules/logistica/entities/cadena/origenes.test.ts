import { describe, expect, it } from 'vitest'
import { origenElegido, type OrigenDeLaCadena } from './origenes'

const o = (id: string): OrigenDeLaCadena => ({ id, nombre: id, color: null, reglas: [] })

describe('origenElegido', () => {
  const lista = [o('a'), o('b')]
  it('el pedido, si está entre las pestañas', () => {
    expect(origenElegido(lista, 'b')?.id).toBe('b')
  })
  it('uno ajeno, inválido o ausente cae en el primero, sin error', () => {
    expect(origenElegido(lista, 'zzz')?.id).toBe('a')
    expect(origenElegido(lista, null)?.id).toBe('a')
    expect(origenElegido(lista, undefined)?.id).toBe('a')
  })
  it('sin pedido, el último elegido si sigue en la lista; si ya no está, el primero', () => {
    expect(origenElegido(lista, undefined, 'b')?.id).toBe('b')
    expect(origenElegido(lista, null, 'zzz')?.id).toBe('a')
    expect(origenElegido(lista, 'a', 'b')?.id).toBe('a')
  })
  it('sin pestañas, nulo', () => {
    expect(origenElegido([], 'a')).toBeNull()
  })
})
