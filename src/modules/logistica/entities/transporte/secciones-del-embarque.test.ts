import { describe, expect, it } from 'vitest'
import type { ContenedorDelEmbarque, VehiculoDelEmbarque } from './embarque'
import { seccionesDelEmbarque } from './secciones-del-embarque'

const C1 = '7b2f5d3e-8c2b-4a7e-9f10-2b3c4d5e6f71'
const C2 = '7b2f5d3e-8c2b-4a7e-9f10-2b3c4d5e6f79'
const V = '6a1f5d3e-8c2b-4a7e-9f10-2b3c4d5e6f70'
const T = '2026-11-26T10:00:00+00:00'

const contenedor = (id: string, numero: string): ContenedorDelEmbarque => ({
  id,
  numero,
  tipo: null,
  tipoNombre: null,
  sello: null,
  estado: 'armandose',
  actualizadoEn: T,
})
const vehiculo = (titulo: string, contenedorId: string | null): VehiculoDelEmbarque => ({
  vehiculoId: V,
  titulo,
  vin: null,
  lote: null,
  faseId: null,
  fase: null,
  faseColor: null,
  contenedorId,
  contenedor: null,
  transporteActualizadoEn: T,
  falta: false,
  declaracion: null,
})

describe('seccionesDelEmbarque', () => {
  it('una sección por contenedor en su orden, vacía incluida, y los sueltos al final', () => {
    const s = seccionesDelEmbarque({
      contenedores: [contenedor(C1, 'A'), contenedor(C2, 'B')],
      vehiculos: [vehiculo('Hilux', C1), vehiculo('Ranger', null), vehiculo('Corolla', C1)],
    })
    expect(
      s.contenedores.map((c) => [c.contenedor.numero, c.vehiculos.map((v) => v.titulo)]),
    ).toEqual([
      ['A', ['Hilux', 'Corolla']],
      ['B', []],
    ])
    expect(s.sueltos.map((v) => v.titulo)).toEqual(['Ranger'])
    expect(s.otros).toEqual([])
  })

  it('un vehículo de un contenedor que pasó el tope va en «Otros contenedores»', () => {
    const s = seccionesDelEmbarque({
      contenedores: [contenedor(C1, 'A')],
      vehiculos: [vehiculo('Hilux', C2)],
    })
    expect(s.otros.map((v) => v.titulo)).toEqual(['Hilux'])
  })
})
