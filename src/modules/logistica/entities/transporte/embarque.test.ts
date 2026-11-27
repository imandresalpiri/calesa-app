import { describe, expect, it } from 'vitest'
import { contenedorLeidoDesde, embarqueLeidoDesde } from './embarque'

const E = '8c3f5d3e-8c2b-4a7e-9f10-2b3c4d5e6f72'
const O = '9d4f5d3e-8c2b-4a7e-9f10-2b3c4d5e6f73'
const C1 = '7b2f5d3e-8c2b-4a7e-9f10-2b3c4d5e6f71'
const V = '6a1f5d3e-8c2b-4a7e-9f10-2b3c4d5e6f70'
const D = '5a1f5d3e-8c2b-4a7e-9f10-2b3c4d5e6f70'
const T = '2026-11-26T10:00:00+00:00'

const filaDelVehiculo = {
  vehiculo_id: V,
  titulo: 'Toyota Hilux',
  vin: 'VIN1',
  lote: null,
  fase_id: null,
  fase: 'Puerto',
  fase_color: null,
  contenedor_id: C1,
  contenedor: 'MSCU1234',
  transporte_actualizado_en: T,
  falta: true,
  declaracion: { id: D, numero: 'DUI-1' },
}

const datosDelEmbarque = {
  id: E,
  origen_id: O,
  booking: 'BK1',
  naviera_id: null,
  puerto_origen_id: null,
  puerto_destino_id: null,
  zarpe_estimado_el: '2026-11-20',
  zarpe_el: null,
  eta_el: '2026-12-20',
  arribo_el: null,
  notas: null,
  actualizado_en: T,
  estado: 'armandose',
  contenedores: [
    {
      id: C1,
      numero: 'MSCU1234',
      tipo: '40hc',
      tipo_nombre: "40' HC",
      sello: null,
      estado: 'armandose',
      actualizado_en: T,
    },
  ],
  hay_mas_contenedores: false,
  vehiculos: [filaDelVehiculo],
  hay_mas: false,
  hay_ocultos: true,
  conteo: { n: 1, hay_mas: false },
  editable: true,
}

describe('embarqueLeidoDesde', () => {
  it('lee el embarque con sus contenedores, sus vehículos y lo que la base calculó', () => {
    const e = embarqueLeidoDesde(datosDelEmbarque)
    expect(e).toMatchObject({
      id: E,
      origenId: O,
      booking: 'BK1',
      zarpeEstimadoEl: '2026-11-20',
      estado: 'armandose',
      hayOcultos: true,
      conteo: { n: 1, hayMas: false },
      editable: true,
    })
    expect(e?.contenedores[0]).toMatchObject({ numero: 'MSCU1234', tipoNombre: "40' HC" })
    expect(e?.vehiculos[0]).toMatchObject({
      vehiculoId: V,
      contenedorId: C1,
      falta: true,
      declaracion: { id: D, numero: 'DUI-1' },
      transporteActualizadoEn: T,
    })
  })

  it('un estado que no existe o una forma distinta da nulo', () => {
    expect(embarqueLeidoDesde({ ...datosDelEmbarque, estado: 'perdido' })).toBeNull()
    expect(embarqueLeidoDesde(null)).toBeNull()
  })
})

describe('contenedorLeidoDesde', () => {
  it('lee el contenedor sin embarque y con él', () => {
    const base = {
      id: C1,
      origen_id: O,
      numero: 'MSCU1234',
      tipo: null,
      tipo_nombre: null,
      sello: 'S1',
      notas: null,
      actualizado_en: T,
      estado: 'sin_embarque',
      embarque: null,
      vehiculos: [],
      hay_mas: false,
      hay_ocultos: false,
      editable: false,
    }
    expect(contenedorLeidoDesde(base)).toMatchObject({
      estado: 'sin_embarque',
      embarque: null,
      sello: 'S1',
    })
    expect(
      contenedorLeidoDesde({
        ...base,
        estado: 'en_transito',
        embarque: {
          id: E,
          booking: 'BK1',
          estado: 'en_transito',
          zarpe_el: '2026-11-20',
          eta_el: null,
          arribo_el: null,
        },
      })?.embarque,
    ).toEqual({
      id: E,
      booking: 'BK1',
      estado: 'en_transito',
      zarpeEl: '2026-11-20',
      etaEl: null,
      arriboEl: null,
    })
  })
})
