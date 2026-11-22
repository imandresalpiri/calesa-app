import { describe, expect, it } from 'vitest'
import { nodoDelItem, type Diseno } from '../diseno'
import { celda, disenoDe, seccion } from './diseno-de-prueba.soporte'
import { destinoDeUnPaso, moverItemA } from './orden-del-diseno'

const base = Object.freeze(
  disenoDe([
    seccion('a', [celda('a'), celda('b'), { tipo: 'total' }]),
    seccion('b', [celda('c')], { presentacion: 'avanzado' }),
    seccion('c', [celda('neto')], { nivel_ver: 'costos', nivel_editar: 'costos' }),
    seccion('d', [celda('comision', { secundario: 'porcentaje' })]),
  ]),
)
const nodos = (d: Diseno, s: number) => d.secciones[s]?.items.map((i) => nodoDelItem(i))

describe('mover una pieza entre secciones', () => {
  it('la saca de su sección y la pone en el lugar pedido de la otra, sin mutar', () => {
    const d = moverItemA(
      base,
      { seccion: 'a', tipo: 'celda', nodo: 'b' },
      { seccion: 'b', indice: 0 },
    )
    expect(nodos(d, 0)).toEqual(['a', null])
    expect(nodos(d, 1)).toEqual(['b', 'c'])
    expect(nodos(base, 0)).toEqual(['a', 'b', null])
  })

  it('dentro de su sección, la cambia de lugar (acotado al largo)', () => {
    const d = moverItemA(
      base,
      { seccion: 'a', tipo: 'celda', nodo: 'a' },
      { seccion: 'a', indice: 9 },
    )
    expect(nodos(d, 0)).toEqual(['b', null, 'a'])
  })

  it('la tarjeta del total no entra a una sección avanzada ni a una con nivel', () => {
    const total = { seccion: 'a', tipo: 'total' } as const
    expect(moverItemA(base, total, { seccion: 'b', indice: 0 })).toBe(base)
    expect(moverItemA(base, total, { seccion: 'c', indice: 0 })).toBe(base)
    expect(nodos(moverItemA(base, total, { seccion: 'd', indice: 1 }), 3)).toEqual([
      'comision',
      null,
    ])
  })

  it('una pieza o una sección que no está deja el diseño tal cual', () => {
    expect(
      moverItemA(base, { seccion: 'a', tipo: 'celda', nodo: 'zz' }, { seccion: 'b', indice: 0 }),
    ).toBe(base)
    expect(
      moverItemA(base, { seccion: 'a', tipo: 'celda', nodo: 'a' }, { seccion: 'zz', indice: 0 }),
    ).toBe(base)
  })
})

describe('un paso con el teclado', () => {
  it('dentro de la sección, el lugar vecino; en el borde, la sección vecina', () => {
    expect(destinoDeUnPaso(base, { seccion: 'a', tipo: 'celda', nodo: 'b' }, -1)).toEqual({
      seccion: 'a',
      indice: 0,
    })
    expect(destinoDeUnPaso(base, { seccion: 'a', tipo: 'celda', nodo: 'a' }, -1)).toBeNull()
    expect(destinoDeUnPaso(base, { seccion: 'b', tipo: 'celda', nodo: 'c' }, -1)).toEqual({
      seccion: 'a',
      indice: 3,
    })
    expect(destinoDeUnPaso(base, { seccion: 'b', tipo: 'celda', nodo: 'c' }, 1)).toEqual({
      seccion: 'c',
      indice: 0,
    })
  })

  it('la tarjeta del total salta las secciones que no la admiten', () => {
    expect(destinoDeUnPaso(base, { seccion: 'a', tipo: 'total' }, 1)).toEqual({
      seccion: 'd',
      indice: 0,
    })
    expect(destinoDeUnPaso(base, { seccion: 'a', tipo: 'total' }, -1)).toEqual({
      seccion: 'a',
      indice: 1,
    })
  })
})
