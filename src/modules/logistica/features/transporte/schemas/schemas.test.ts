import { describe, expect, it } from 'vitest'
import { esquemaAsignarUnidades, esquemaPonerElVehiculoEnTransporte } from './asignacion'
import { esquemaCrearContenedor, esquemaGuardarContenedor } from './contenedor'
import { esquemaCrearEmbarque, esquemaGuardarEmbarque } from './embarque'

const A = '6a1f5d3e-8c2b-4a7e-9f10-2b3c4d5e6f70'
const B = '7b2f5d3e-8c2b-4a7e-9f10-2b3c4d5e6f71'
const O = '8c3f5d3e-8c2b-4a7e-9f10-2b3c4d5e6f72'

describe('esquemaCrearEmbarque', () => {
  it('pasa el booking a mayúsculas y sin espacios', () => {
    const r = esquemaCrearEmbarque.parse({ id: A, origenId: O, datos: { booking: ' bk 12/3 ' } })
    expect(r.datos.booking).toBe('BK12/3')
  })

  it('rechaza un booking con otros signos, un id que no es uuid y una clave de más', () => {
    expect(
      esquemaCrearEmbarque.safeParse({ id: A, origenId: O, datos: { booking: 'BK#1' } }).success,
    ).toBe(false)
    expect(
      esquemaCrearEmbarque.safeParse({ id: 'x', origenId: O, datos: { booking: 'BK1' } }).success,
    ).toBe(false)
    expect(
      esquemaCrearEmbarque.safeParse({
        id: A,
        origenId: O,
        datos: { booking: 'BK1', origen_id: O },
      }).success,
    ).toBe(false)
    expect(
      esquemaCrearEmbarque.safeParse({ id: A, origenId: O, datos: { booking: 'B'.repeat(41) } })
        .success,
    ).toBe(false)
  })

  it('las fechas van AAAA-MM-DD y `null` vacía', () => {
    expect(
      esquemaCrearEmbarque.safeParse({
        id: A,
        origenId: O,
        datos: { booking: 'BK1', eta_el: '2026-12-01', naviera_id: null },
      }).success,
    ).toBe(true)
    expect(
      esquemaCrearEmbarque.safeParse({
        id: A,
        origenId: O,
        datos: { booking: 'BK1', eta_el: '01/12/2026' },
      }).success,
    ).toBe(false)
  })
})

describe('esquemaGuardarEmbarque', () => {
  it('pide la versión y algo que guardar', () => {
    const base = { id: A, origenId: O, actualizadoEnEsperado: '2026-11-26T10:00:00Z' }
    expect(esquemaGuardarEmbarque.safeParse({ ...base, cambios: {} }).success).toBe(false)
    expect(
      esquemaGuardarEmbarque.safeParse({
        ...base,
        actualizadoEnEsperado: '',
        cambios: { notas: null },
      }).success,
    ).toBe(false)
    expect(
      esquemaGuardarEmbarque.parse({ ...base, cambios: { booking: 'bk2' } }).cambios.booking,
    ).toBe('BK2')
  })
})

describe('los esquemas del contenedor', () => {
  it('normaliza el número y deja sin embarque con nulo', () => {
    const r = esquemaCrearContenedor.parse({
      id: A,
      origenId: O,
      datos: { numero: 'mscu 1234567', embarque_id: null },
    })
    expect(r.datos).toEqual({ numero: 'MSCU1234567', embarque_id: null })
  })

  it('rechaza un sello largo y un embarque que no es uuid', () => {
    const base = { id: A, origenId: O, actualizadoEnEsperado: '2026-11-26T10:00:00Z' }
    expect(
      esquemaGuardarContenedor.safeParse({ ...base, cambios: { sello: 'S'.repeat(41) } }).success,
    ).toBe(false)
    expect(
      esquemaGuardarContenedor.safeParse({ ...base, cambios: { embarque_id: 'BK1' } }).success,
    ).toBe(false)
  })
})

describe('esquemaAsignarUnidades', () => {
  const pedido = (unidades: unknown[]) => ({
    tipo: 'contenedor',
    destinoId: B,
    origenId: O,
    unidades,
    mover: false,
  })

  it('de 1 a 200, sin repetidas', () => {
    expect(esquemaAsignarUnidades.safeParse(pedido([])).success).toBe(false)
    expect(
      esquemaAsignarUnidades.safeParse(pedido([{ vehiculoId: A, actualizadoEn: null }])).success,
    ).toBe(true)
    expect(
      esquemaAsignarUnidades.safeParse(
        pedido([
          { vehiculoId: A, actualizadoEn: null },
          { vehiculoId: A, actualizadoEn: '2026-11-26T10:00:00Z' },
        ]),
      ).success,
    ).toBe(false)
    const muchas = Array.from({ length: 201 }, (_, i) => ({
      vehiculoId: `6a1f5d3e-8c2b-4a7e-9f10-${String(i).padStart(12, '0')}`,
      actualizadoEn: null,
    }))
    expect(esquemaAsignarUnidades.safeParse(pedido(muchas)).success).toBe(false)
    expect(esquemaAsignarUnidades.safeParse(pedido(muchas.slice(0, 200))).success).toBe(true)
  })

  it('el destino es un embarque o un contenedor', () => {
    expect(
      esquemaAsignarUnidades.safeParse({
        ...pedido([{ vehiculoId: A, actualizadoEn: null }]),
        tipo: 'booking',
      }).success,
    ).toBe(false)
  })
})

describe('esquemaPonerElVehiculoEnTransporte', () => {
  it('uno nuevo lleva lo mínimo: su número normalizado y su tipo, o su booking y su naviera', () => {
    const r = esquemaPonerElVehiculoEnTransporte.parse({
      origenId: O,
      vehiculoId: A,
      actualizadoEn: null,
      destino: { tipo: 'contenedor', id: B, nuevo: { numero: 'tghu 5678', tipo: '40hc' } },
      mover: false,
    })
    expect(r.destino).toEqual({
      tipo: 'contenedor',
      id: B,
      nuevo: { numero: 'TGHU5678', tipo: '40hc' },
    })
    expect(
      esquemaPonerElVehiculoEnTransporte.safeParse({
        origenId: O,
        vehiculoId: A,
        actualizadoEn: null,
        destino: { tipo: 'embarque', id: B, nuevo: { booking: 'bk 1', naviera_id: 'x' } },
        mover: false,
      }).success,
    ).toBe(false)
    expect(
      esquemaPonerElVehiculoEnTransporte.safeParse({
        origenId: O,
        vehiculoId: A,
        actualizadoEn: null,
        destino: { tipo: 'embarque', id: B, nuevo: { numero: 'X', tipo: null } },
        mover: false,
      }).success,
    ).toBe(false)
  })
})
