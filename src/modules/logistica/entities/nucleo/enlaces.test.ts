import { describe, expect, it } from 'vitest'
import { CLAVE_DEL_HUECO_ABIERTO, enElOrigen, rutaDeLaUnidad } from './enlaces'

describe('rutaDeLaUnidad', () => {
  it('lleva a la página de la unidad', () => {
    expect(rutaDeLaUnidad('a1')).toBe('/logistica/vehiculo/a1')
  })

  it('con un hueco o una tarjeta, pide la tarjeta que lo contiene', () => {
    expect(rutaDeLaUnidad('a1', 'documentos')).toBe('/logistica/vehiculo/a1?hueco=documentos')
    expect(rutaDeLaUnidad('a1', 'pagos')).toBe('/logistica/vehiculo/a1?hueco=dinero')
    expect(rutaDeLaUnidad('a1', 'margen')).toBe('/logistica/vehiculo/a1?hueco=dinero')
    expect(rutaDeLaUnidad('a1', 'dinero')).toBe('/logistica/vehiculo/a1?hueco=dinero')
    expect(CLAVE_DEL_HUECO_ABIERTO).toBe('hueco')
  })

  it('«Qué falta» (siempre a la vista) y una clave desconocida o vacía se descartan', () => {
    expect(rutaDeLaUnidad('a1', 'que-falta')).toBe('/logistica/vehiculo/a1')
    expect(rutaDeLaUnidad('a1', 'otro')).toBe('/logistica/vehiculo/a1')
    expect(rutaDeLaUnidad('a1', '')).toBe('/logistica/vehiculo/a1')
    expect(rutaDeLaUnidad('a1', null)).toBe('/logistica/vehiculo/a1')
  })

  it('escapa un id raro', () => {
    expect(rutaDeLaUnidad('a/b')).toBe('/logistica/vehiculo/a%2Fb')
  })
})

describe('enElOrigen', () => {
  it('pone el origen en la URL, escapado', () => {
    expect(enElOrigen('/logistica/bandeja', 'o1')).toBe('/logistica/bandeja?origen=o1')
    expect(enElOrigen('/logistica', 'a b')).toBe('/logistica?origen=a%20b')
  })
})
