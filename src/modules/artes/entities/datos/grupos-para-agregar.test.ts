import { describe, expect, it } from 'vitest'
import { catalogoDe } from './datos-de-prueba.soporte'
import { gruposParaAgregar } from './grupos-para-agregar'

describe('gruposParaAgregar', () => {
  it('pone la ficha del origen en su grupo, después del vehículo, y las celdas de la cotización elegida al final de Cotización', () => {
    const grupos = gruposParaAgregar(catalogoDe('subasta'), {
      origen: 'Copart',
      celdas: ['Flete', 'Aduana'],
    })
    expect(grupos.map((g) => g.titulo)).toEqual([
      'Vehículo',
      'Ficha de Copart',
      'Cotización',
      'Cliente',
      'Quien comparte',
      'Empresa',
    ])
    expect(grupos[1]?.datos).toEqual([{ clave: 'ficha.motor', etiqueta: 'Motor' }])
    expect(grupos[2]?.datos.slice(-2)).toEqual([
      { clave: 'celda.Flete', etiqueta: 'Flete' },
      { clave: 'celda.Aduana', etiqueta: 'Aduana' },
    ])
  })

  it('en un origen manual no ofrece las de subasta', () => {
    const claves = gruposParaAgregar(catalogoDe('manual'), { origen: 'Manuales', celdas: [] })
      .flatMap((g) => g.datos)
      .map((d) => d.clave)
    expect(claves).toContain('vin')
    expect(claves).not.toContain('lote')
    expect(claves).not.toContain('subasta')
  })
})
