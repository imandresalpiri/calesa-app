import { describe, expect, it } from 'vitest'
import { proveedorDeLaUltimaCompra } from './proveedor-del-item'

describe('proveedor de la última compra', () => {
  it('es el de la primera de la lectura (la más reciente)', () => {
    expect(
      proveedorDeLaUltimaCompra([{ proveedor: 'Repuestos Andinos' }, { proveedor: 'Otro' }]),
    ).toBe('Repuestos Andinos')
  })

  it('sin compras, o con la última sin proveedor, no hay', () => {
    expect(proveedorDeLaUltimaCompra([])).toBeNull()
    expect(proveedorDeLaUltimaCompra([{ proveedor: null }, { proveedor: 'Otro' }])).toBeNull()
    expect(proveedorDeLaUltimaCompra([{ proveedor: '  ' }])).toBeNull()
  })
})
