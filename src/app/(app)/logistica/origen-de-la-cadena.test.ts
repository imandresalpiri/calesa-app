import { describe, expect, it } from 'vitest'
import type { OrigenDeLaCadena } from '@/modules/logistica'
import { resolverElOrigen, type DatosDelOrigen } from './origen-de-la-cadena'

const o = (id: string): OrigenDeLaCadena => ({
  id,
  nombre: id.toUpperCase(),
  color: null,
  reglas: [],
})

const base: DatosDelOrigen = {
  visibles: [o('a'), o('b')],
  todos: [
    { id: 'a', nombre: 'A' },
    { id: 'b', nombre: 'B' },
    { id: 'c', nombre: 'C' },
    { id: 'd', nombre: 'D' },
  ],
  // `d` lo ve, pero está inactivo o con la logística apagada; `c` no lo ve.
  conPermiso: ['a', 'b', 'd'],
  pedido: undefined,
  ultimo: null,
}

describe('resolverElOrigen', () => {
  it('el pedido que ve, y lo recuerda si no era ya el último', () => {
    expect(resolverElOrigen({ ...base, pedido: 'b' })).toMatchObject({
      tipo: 'ok',
      origen: { id: 'b' },
      recordar: true,
    })
    expect(resolverElOrigen({ ...base, pedido: 'b', ultimo: 'b' })).toMatchObject({
      tipo: 'ok',
      recordar: false,
    })
  })

  it('sin pedido, el último usado si lo sigue viendo; si no, el primero; nunca lo recuerda', () => {
    expect(resolverElOrigen({ ...base, ultimo: 'b' })).toMatchObject({
      origen: { id: 'b' },
      recordar: false,
    })
    expect(resolverElOrigen({ ...base, ultimo: 'c' })).toMatchObject({ origen: { id: 'a' } })
    expect(resolverElOrigen({ ...base, ultimo: 'd' })).toMatchObject({ origen: { id: 'a' } })
    expect(resolverElOrigen(base)).toMatchObject({ origen: { id: 'a' } })
  })

  it('un pedido sin permiso no cae en otro: sin_permiso con su nombre', () => {
    expect(resolverElOrigen({ ...base, pedido: 'c', ultimo: 'a' })).toEqual({
      tipo: 'sin_permiso',
      nombre: 'C',
      origenes: base.visibles,
    })
  })

  it('un pedido inactivo o con la logística apagada no está disponible; uno desconocido, sin nombre', () => {
    expect(resolverElOrigen({ ...base, pedido: 'd' })).toMatchObject({
      tipo: 'no_disponible',
      nombre: 'D',
    })
    expect(resolverElOrigen({ ...base, pedido: 'zzz' })).toMatchObject({
      tipo: 'no_disponible',
      nombre: null,
    })
  })

  it('sin orígenes de logística, sin_origenes; sin poder leerlos, error', () => {
    expect(resolverElOrigen({ ...base, visibles: [] })).toEqual({ tipo: 'sin_origenes' })
    expect(resolverElOrigen({ ...base, visibles: null, pedido: 'a' })).toEqual({ tipo: 'error' })
  })
})
