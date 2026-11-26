import { describe, expect, it } from 'vitest'
import { categoriasDeFaqDesde, ordenDeCategoriaNueva } from './categorias-de-faq'

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
})
