import { describe, expect, it } from 'vitest'
import { celda, disenoDe, seccion } from './diseno-de-prueba.soporte'
import { nodoDelItem } from '../diseno'
import { moverItem, moverSeccion } from './orden-del-diseno'

const base = disenoDe([
  seccion('a', [celda('a'), celda('b'), celda('c')]),
  seccion('b', [celda('comision')]),
  seccion('c', [celda('neto')]),
])
const ids = (d: typeof base) => d.secciones.map((s) => s.id)
const nodos = (d: typeof base, s: number) => d.secciones[s]?.items.map((i) => nodoDelItem(i))

describe('el orden del diseño', () => {
  it('mueve una sección a otro lugar, hacia adelante y hacia atrás, sin mutar', () => {
    expect(ids(moverSeccion(base, 2, 1))).toStrictEqual(['a', 'c', 'b'])
    expect(ids(moverSeccion(base, 0, 2))).toStrictEqual(['b', 'c', 'a'])
    expect(ids(base)).toStrictEqual(['a', 'b', 'c'])
  })

  it('mueve un ítem dentro de su sección', () => {
    expect(nodos(moverItem(base, 'a', 0, 2), 0)).toStrictEqual(['b', 'c', 'a'])
    expect(nodos(moverItem(base, 'a', 2, 0), 0)).toStrictEqual(['c', 'a', 'b'])
  })

  it('un lugar fuera de la lista, el mismo lugar o una sección que no existe no cambian nada', () => {
    expect(moverSeccion(base, 0, 3)).toBe(base)
    expect(moverSeccion(base, -1, 0)).toBe(base)
    expect(moverSeccion(base, 1, 1)).toBe(base)
    expect(moverItem(base, 'a', 0, 9)).toBe(base)
    expect(moverItem(base, 'zzz', 0, 1)).toBe(base)
  })
})
