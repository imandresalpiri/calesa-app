import { describe, expect, it } from 'vitest'
import {
  rutaDeLaCotizacion,
  rutaDeLaHoja,
  anchoDeLaImagen,
  rutaDeLaImagen,
  rutaDelListado,
  rutaDelPdf,
  sinMonedaDeLaImagen,
} from './ruta-de-la-hoja'

describe('rutaDeLaHoja', () => {
  it('lleva el origen y conserva el lead; el vehículo no viaja (es de otro origen)', () => {
    expect(rutaDeLaHoja({ origen: 'o1', lead: 'l1' })).toBe('/cotizaciones/nuevo?origen=o1&lead=l1')
    expect(rutaDeLaHoja({ origen: 'o1', lead: null })).toBe('/cotizaciones/nuevo?origen=o1')
  })
})

describe('rutaDeLaCotizacion', () => {
  it('es la página de la cotización por su id', () => {
    expect(rutaDeLaCotizacion('0b7a2f0e-1c2d-4e5f-8a9b-0c1d2e3f4a5b')).toBe(
      '/cotizaciones/0b7a2f0e-1c2d-4e5f-8a9b-0c1d2e3f4a5b',
    )
  })
})

describe('rutaDelPdf', () => {
  it('es el PDF de la cotización guardada, bajo su página', () => {
    const id = '00000000-0000-4000-8000-000000000001'
    expect(rutaDelPdf(id)).toBe(`/cotizaciones/${id}/pdf`)
    expect(rutaDelPdf(id).startsWith(rutaDeLaCotizacion(id))).toBe(true)
  })
})

describe('rutaDeLaImagen', () => {
  it('es la imagen de la tarjeta de la cotización guardada, bajo su página', () => {
    const id = '00000000-0000-4000-8000-000000000001'
    expect(rutaDeLaImagen(id)).toBe(`/cotizaciones/${id}/imagen`)
  })
})

describe('rutaDelListado', () => {
  it('sin vehículo es el listado; con vehículo, el listado de ese vehículo', () => {
    expect(rutaDelListado({})).toBe('/cotizaciones')
    expect(rutaDelListado({ vehiculo: '0b7a2f0e-1c2d-4e5f-8a9b-0c1d2e3f4a5b' })).toBe(
      '/cotizaciones?vehiculo=0b7a2f0e-1c2d-4e5f-8a9b-0c1d2e3f4a5b',
    )
  })

  it('con lead, el listado de ese cliente; con los dos, primero el lead', () => {
    const lead = '1c8b3a1f-2d3e-4f60-9bac-1d2e3f4a5b6c'
    const vehiculo = '0b7a2f0e-1c2d-4e5f-8a9b-0c1d2e3f4a5b'
    expect(rutaDelListado({ lead })).toBe(`/cotizaciones?lead=${lead}`)
    expect(rutaDelListado({ lead, vehiculo })).toBe(
      `/cotizaciones?lead=${lead}&vehiculo=${vehiculo}`,
    )
  })
})

describe('la miniatura y el reintento de la imagen', () => {
  it('con ancho, la ruta pide la miniatura; sin él, la grande; con intento, otra URL', () => {
    const id = '00000000-0000-4000-8000-000000000001'
    expect(rutaDeLaImagen(id, { ancho: 480 })).toBe(`/cotizaciones/${id}/imagen?ancho=480`)
    expect(rutaDeLaImagen(id, {})).toBe(`/cotizaciones/${id}/imagen`)
    expect(rutaDeLaImagen(id, { intento: 0 })).toBe(`/cotizaciones/${id}/imagen`)
    expect(rutaDeLaImagen(id, { intento: 2 })).toBe(`/cotizaciones/${id}/imagen?intento=2`)
    expect(rutaDeLaImagen(id, { ancho: 480, intento: 1 })).toBe(
      `/cotizaciones/${id}/imagen?ancho=480&intento=1`,
    )
  })

  it('con `sinMoneda`, la variante del Modo Live: otra URL, con el ancho y el intento', () => {
    const id = '00000000-0000-4000-8000-000000000001'
    expect(rutaDeLaImagen(id, { sinMoneda: true })).toBe(`/cotizaciones/${id}/imagen?sin-moneda=1`)
    expect(rutaDeLaImagen(id, { sinMoneda: false })).toBe(`/cotizaciones/${id}/imagen`)
    expect(rutaDeLaImagen(id, { ancho: 480, sinMoneda: true, intento: 1 })).toBe(
      `/cotizaciones/${id}/imagen?ancho=480&sin-moneda=1&intento=1`,
    )
    expect(sinMonedaDeLaImagen('1')).toBe(true)
    expect(sinMonedaDeLaImagen('0')).toBe(false)
    expect(sinMonedaDeLaImagen('si')).toBe(false)
    expect(sinMonedaDeLaImagen(null)).toBe(false)
  })

  it('`?ancho=` sólo entiende los anchos de la miniatura', () => {
    expect(anchoDeLaImagen('480')).toBe(480)
    expect(anchoDeLaImagen('481')).toBeNull()
    expect(anchoDeLaImagen('1600')).toBeNull()
    expect(anchoDeLaImagen(null)).toBeNull()
  })
})
