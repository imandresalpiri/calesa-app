import { describe, expect, it } from 'vitest'
import { COTIZACION_ID, datosReales, FOTO_1, VEHICULO_ID } from './datos-de-prueba.soporte'
import {
  esquemaDeLaCotizacionDeEjemplo,
  esquemaDeLasCotizacionesDeEjemplo,
  esquemaDelVehiculoDeEjemplo,
  esquemaDeLosLeadsDeEjemplo,
  esquemaDeLosVehiculosDeEjemplo,
} from './respuestas'

const LEAD = '55555555-5555-4555-8555-555555555555'
const { vehiculo, cotizacion } = datosReales()

describe('lo que responde la lista de vehículos de ejemplo', () => {
  it('una página de vehículos, con su miniatura y su cursor', () => {
    const pagina = {
      filas: [
        {
          id: VEHICULO_ID,
          titulo: 'Nissan Frontier 2019',
          anio: 2019,
          lote: '5678',
          miniatura: `https://ejemplo.supabase.co/storage/v1/render/image/${FOTO_1}`,
        },
        { id: FOTO_1, titulo: 'Sin foto', anio: null, lote: null, miniatura: null },
      ],
      siguiente: 'eyJjIjoxfQ',
    }
    expect(esquemaDeLosVehiculosDeEjemplo.parse(pagina)).toEqual(pagina)
    expect(esquemaDeLosVehiculosDeEjemplo.safeParse({ ...pagina, siguiente: '' }).success).toBe(
      false,
    )
  })

  it('una miniatura que no es http(s) no pasa', () => {
    const fila = { id: VEHICULO_ID, titulo: 'x', anio: null, lote: null, miniatura: 'javascript:1' }
    expect(
      esquemaDeLosVehiculosDeEjemplo.safeParse({ filas: [fila], siguiente: null }).success,
    ).toBe(false)
  })
})

describe('lo que responde la ruta del vehículo', () => {
  it('el vehículo con sus leads por grupo, o el motivo de no verlos', () => {
    const conLeads = {
      vehiculo,
      leads: { grupos: [{ tipo: 'vinculado', leads: [{ leadId: LEAD, nombre: 'Lucía Paz' }] }] },
    }
    expect(esquemaDelVehiculoDeEjemplo.parse(conLeads)).toEqual(conLeads)
    const conMotivo = { vehiculo, leads: { motivo: 'Oculto en Modo Live' } }
    expect(esquemaDelVehiculoDeEjemplo.parse(conMotivo)).toEqual(conMotivo)
    expect(
      esquemaDeLosLeadsDeEjemplo.safeParse({ grupos: [{ tipo: 'otro', leads: [] }] }).success,
    ).toBe(false)
  })

  it('un lead se lee sólo con su id y su nombre (nunca un teléfono)', () => {
    const leido = esquemaDeLosLeadsDeEjemplo.parse({
      grupos: [
        { tipo: 'cotizado', leads: [{ leadId: LEAD, nombre: 'Lucía', telefono: '+591 7' }] },
      ],
    })
    expect(leido).toEqual({
      grupos: [{ tipo: 'cotizado', leads: [{ leadId: LEAD, nombre: 'Lucía' }] }],
    })
  })
})

describe('lo que responden las rutas de las cotizaciones', () => {
  it('una página de cotizaciones del vehículo', () => {
    const pagina = {
      filas: [
        {
          id: COTIZACION_ID,
          numero: 128,
          titulo: 'Nissan Frontier 2019',
          total: 21300,
          moneda: 'USD',
          modo: 'Paralelo',
          aprobada: true,
        },
      ],
      siguiente: null,
    }
    expect(esquemaDeLasCotizacionesDeEjemplo.parse(pagina)).toEqual(pagina)
  })

  it('la cotización para el arte, con su lead o sin él', () => {
    expect(esquemaDeLaCotizacionDeEjemplo.parse({ cotizacion, leadId: LEAD })).toEqual({
      cotizacion,
      leadId: LEAD,
    })
    expect(esquemaDeLaCotizacionDeEjemplo.safeParse({ cotizacion, leadId: null }).success).toBe(
      true,
    )
  })

  it('la tarjeta sólo por la ruta del mismo origen', () => {
    if (!cotizacion) {
      throw new Error('falta la cotización')
    }
    const deOtroOrigen = {
      cotizacion: { ...cotizacion, imagen: { src: 'https://otro.com/x.png', srcSinMoneda: 'x' } },
      leadId: null,
    }
    expect(esquemaDeLaCotizacionDeEjemplo.safeParse(deOtroOrigen).success).toBe(false)
  })
})
