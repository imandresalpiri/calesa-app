import { describe, expect, it } from 'vitest'
import {
  avisoDeMover,
  destinosParaElegir,
  rutaYFechasPropias,
  textoSinDestino,
  yaVaEn,
} from './donde-viaja'
import type { EntidadesDeLaUnidad } from './lectura-de-la-unidad'

const vehiculos = { n: 1, hayMas: false, hayOcultas: false }
const embarque = {
  id: 'e1',
  booking: 'BK1',
  actualizadoEn: '2026-11-27T00:00:00Z',
  estado: 'en_transito' as const,
  vehiculos,
}
const contenedor = {
  id: 'c1',
  numero: 'MSCU1',
  actualizadoEn: '2026-11-27T00:00:00Z',
  estado: 'en_transito' as const,
  vehiculos,
}

const suelto: EntidadesDeLaUnidad = { embarque: null, contenedorDeLaUnidad: null }
const enContenedorConEmbarque: EntidadesDeLaUnidad = { embarque, contenedorDeLaUnidad: contenedor }
const enContenedorSinEmbarque: EntidadesDeLaUnidad = {
  embarque: null,
  contenedorDeLaUnidad: { ...contenedor, estado: 'sin_embarque' },
}
const directoEnEmbarque: EntidadesDeLaUnidad = { embarque, contenedorDeLaUnidad: null }

describe('rutaYFechasPropias', () => {
  it('sin embarque la ruta y las fechas son del vehículo, también en un contenedor suelto', () => {
    expect(rutaYFechasPropias(suelto)).toBe(true)
    expect(rutaYFechasPropias(enContenedorSinEmbarque)).toBe(true)
  })

  it('con embarque, directo o por su contenedor, son del embarque', () => {
    expect(rutaYFechasPropias(directoEnEmbarque)).toBe(false)
    expect(rutaYFechasPropias(enContenedorConEmbarque)).toBe(false)
  })
})

describe('destinosParaElegir y textoSinDestino', () => {
  it('ofrece contenedores sólo si el flujo los usa', () => {
    expect(destinosParaElegir(true)).toEqual(['contenedor', 'embarque'])
    expect(destinosParaElegir(false)).toEqual(['embarque'])
    expect(textoSinDestino(true)).toBe('Todavía no va en ningún contenedor.')
    expect(textoSinDestino(false)).toBe('Todavía no va en ningún embarque.')
  })
})

describe('yaVaEn y avisoDeMover', () => {
  it('un vehículo suelto no pide confirmar', () => {
    expect(avisoDeMover(suelto, { tipo: 'contenedor', id: 'c2' })).toBeNull()
    expect(avisoDeMover(suelto, { tipo: 'embarque', id: 'e2' })).toBeNull()
  })

  it('el mismo destino no cambia nada; el embarque de su contenedor también es «ya va»', () => {
    expect(yaVaEn(enContenedorConEmbarque, { tipo: 'contenedor', id: 'c1' })).toBe(true)
    expect(yaVaEn(enContenedorConEmbarque, { tipo: 'embarque', id: 'e1' })).toBe(true)
    expect(avisoDeMover(enContenedorConEmbarque, { tipo: 'embarque', id: 'e1' })).toBeNull()
  })

  it('otro destino pide confirmar y nombra dónde va hoy', () => {
    expect(avisoDeMover(enContenedorConEmbarque, { tipo: 'contenedor', id: 'c2' })).toBe(
      'Hoy va en el contenedor MSCU1. Se mueve al elegido.',
    )
    expect(avisoDeMover(directoEnEmbarque, { tipo: 'contenedor', id: 'c2' })).toBe(
      'Hoy va en el embarque BK1. Se mueve al elegido.',
    )
    expect(avisoDeMover(enContenedorSinEmbarque, { tipo: 'embarque', id: 'e2' })).toBe(
      'Hoy va en el contenedor MSCU1. Se mueve al elegido.',
    )
  })
})
