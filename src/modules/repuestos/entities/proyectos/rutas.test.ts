import { describe, expect, it } from 'vitest'
import { rutaDelProyecto, rutaDeNuevoItem, rutaDeNuevoProyectoConVehiculo } from './rutas'

describe('rutas de un proyecto', () => {
  it('cuelga del listado', () => {
    expect(rutaDelProyecto('abc')).toBe('/repuestos/abc')
  })

  it('abre «Agregar ítem» en la hoja y «Nuevo proyecto» con el vehículo', () => {
    expect(rutaDeNuevoItem('abc')).toBe('/repuestos/abc?panel=nuevo-item')
    expect(rutaDeNuevoProyectoConVehiculo('v1')).toBe('/repuestos?panel=nuevo-proyecto&vehiculo=v1')
  })
})
