import { describe, expect, it } from 'vitest'
import { elementoDeCatalogoDesde } from './tipos'

const ID = '0b7a8c1e-2f4d-4c6b-9a1e-3d5f7b9c1a2e'

describe('elementoDeCatalogoDesde', () => {
  it('pasa la fila de la base a la forma de la app', () => {
    expect(
      elementoDeCatalogoDesde({
        id: ID,
        nombre: 'Datos',
        orden: 10,
        activo: true,
        actualizado_en: '2026-11-26T10:00:00Z',
      }),
    ).toEqual({
      id: ID,
      nombre: 'Datos',
      orden: 10,
      activo: true,
      actualizadoEn: '2026-11-26T10:00:00Z',
    })
  })

  it('rechaza una fila sin id válido', () => {
    expect(() =>
      elementoDeCatalogoDesde({
        id: 'x',
        nombre: 'Datos',
        orden: 10,
        activo: true,
        actualizado_en: '',
      }),
    ).toThrow()
  })
})
