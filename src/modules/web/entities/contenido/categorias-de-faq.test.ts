import { describe, expect, it } from 'vitest'
import {
  categoriasDeFaqDesde,
  ordenDeCategoriaNueva,
  ordenesTrasMover,
  type CategoriaDeFaq,
} from './categorias-de-faq'

const FILA = {
  id: '0b7a8c1e-2f4d-4c6b-9a1e-3d5f7b9c1a2e',
  nombre: 'Envíos',
  orden: 10,
  activo: true,
  actualizado_en: '2026-11-26T10:00:00+00:00',
}

describe('las categorías de FAQ', () => {
  it('lee las filas del catálogo con su versión, o nulo si alguna no tiene la forma', () => {
    expect(categoriasDeFaqDesde([FILA])).toEqual([
      {
        id: FILA.id,
        nombre: 'Envíos',
        orden: 10,
        activo: true,
        actualizadoEn: FILA.actualizado_en,
      },
    ])
    expect(categoriasDeFaqDesde([{ ...FILA, id: 'no-es-un-id' }])).toBeNull()
    expect(categoriasDeFaqDesde(null)).toBeNull()
  })

  it('una nueva va diez después de la última', () => {
    expect(ordenDeCategoriaNueva([])).toBe(10)
    expect(ordenDeCategoriaNueva([10, 30, 20])).toBe(40)
  })

  describe('el orden tras mover una', () => {
    const categoria = (id: string, orden: number): CategoriaDeFaq => ({
      id,
      nombre: id,
      orden,
      activo: true,
      actualizadoEn: `v-${id}`,
    })
    const lista = [categoria('a', 10), categoria('b', 20), categoria('c', 30)]

    it('subir la última detrás de la primera reescribe sólo las que cambian, con su versión', () => {
      expect(ordenesTrasMover(lista, 'c', 'a')).toEqual([
        { id: 'c', actualizadoEn: 'v-c', orden: 20 },
        { id: 'b', actualizadoEn: 'v-b', orden: 30 },
      ])
    })

    it('sin `despuesDe` va primera', () => {
      expect(ordenesTrasMover(lista, 'b', null)).toEqual([
        { id: 'b', actualizadoEn: 'v-b', orden: 10 },
        { id: 'a', actualizadoEn: 'v-a', orden: 20 },
      ])
    })

    it('normaliza los órdenes viejos de a diez aunque no se mueva nada', () => {
      expect(ordenesTrasMover([categoria('a', 1), categoria('b', 20)], 'a', null)).toEqual([
        { id: 'a', actualizadoEn: 'v-a', orden: 10 },
      ])
    })

    it('nulo si la que se mueve o su vecina ya no están', () => {
      expect(ordenesTrasMover(lista, 'z', null)).toBeNull()
      expect(ordenesTrasMover(lista, 'a', 'z')).toBeNull()
    })
  })
})
