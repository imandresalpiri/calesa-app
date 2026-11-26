import { describe, expect, it } from 'vitest'
import { nombreDelEnlaceAlVehiculo, rutaDelVehiculoDeLaFila } from './ruta-del-vehiculo'

const ID = '11111111-1111-4111-8111-111111111111'

describe('rutaDelVehiculoDeLaFila', () => {
  it('enlaza a la ficha si quien mira ve los vehículos del origen', () => {
    expect(rutaDelVehiculoDeLaFila({ vehiculoId: ID, origenId: 'o1' }, 'todos')).toBe(
      `/vehiculos/${ID}`,
    )
    expect(rutaDelVehiculoDeLaFila({ vehiculoId: ID, origenId: 'o1' }, ['o1'])).toBe(
      `/vehiculos/${ID}`,
    )
  })
  it('no enlaza sin vehículo o sin permiso en el origen', () => {
    expect(rutaDelVehiculoDeLaFila({ vehiculoId: null, origenId: 'o1' }, 'todos')).toBeNull()
    expect(rutaDelVehiculoDeLaFila({ vehiculoId: ID, origenId: 'o2' }, ['o1'])).toBeNull()
    expect(rutaDelVehiculoDeLaFila({ vehiculoId: ID, origenId: 'o1' }, [])).toBeNull()
  })
  it('nombra el enlace', () => {
    expect(nombreDelEnlaceAlVehiculo('Kia Seltos')).toBe('Ver Kia Seltos en Vehículos')
  })
})
