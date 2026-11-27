import { describe, expect, it } from 'vitest'
import { accionDeEmpezar } from './empezar'
import type { ProyectoDeVehiculo } from './resumen'

const V = '00000000-0000-4000-8000-0000000000a1'
const proyecto = (cerradoEn: string | null): ProyectoDeVehiculo => ({
  id: 'p1',
  numero: 7,
  cerradoEn,
  actualizadoEn: '2026-11-01',
})

describe('accionDeEmpezar', () => {
  it('sin proyecto y con permiso: «Pedir repuestos para este vehículo»', () => {
    expect(accionDeEmpezar({ vehiculoId: V, proyecto: null, puedeEditar: true })).toEqual({
      clave: 'pedir',
      etiqueta: 'Pedir repuestos para este vehículo',
      destino: { tipo: 'ruta', href: `/repuestos?panel=nuevo-proyecto&vehiculo=${V}` },
    })
  })

  it('con el proyecto abierto: «Agregar un repuesto»; cerrado: ninguna', () => {
    expect(
      accionDeEmpezar({ vehiculoId: V, proyecto: proyecto(null), puedeEditar: true }),
    ).toMatchObject({
      etiqueta: 'Agregar un repuesto',
      destino: { href: '/repuestos/p1?panel=nuevo-item' },
    })
    expect(
      accionDeEmpezar({ vehiculoId: V, proyecto: proyecto('2026-11-02'), puedeEditar: true }),
    ).toBeNull()
  })

  it('sin `repuestos.editar` no ofrece empezar', () => {
    expect(accionDeEmpezar({ vehiculoId: V, proyecto: null, puedeEditar: false })).toBeNull()
  })
})
