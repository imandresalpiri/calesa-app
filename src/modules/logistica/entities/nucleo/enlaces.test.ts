import { describe, expect, it } from 'vitest'
import { CLAVE_DEL_HUECO_ABIERTO, enElOrigen, esHuecoConocido, rutaDeLaUnidad } from './enlaces'
import { ORDEN_DE_HUECOS } from './hueco'

describe('rutaDeLaUnidad', () => {
  it('lleva a la página de la unidad', () => {
    expect(rutaDeLaUnidad('a1')).toBe('/logistica/vehiculo/a1')
  })

  it('con un hueco conocido, lo pide por la URL', () => {
    expect(rutaDeLaUnidad('a1', 'documentos')).toBe('/logistica/vehiculo/a1?hueco=documentos')
    expect(CLAVE_DEL_HUECO_ABIERTO).toBe('hueco')
  })

  it('un hueco desconocido o vacío se descarta', () => {
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

describe('esHuecoConocido', () => {
  it('acepta cada hueco del panel y nada más', () => {
    for (const clave of ORDEN_DE_HUECOS) expect(esHuecoConocido(clave)).toBe(true)
    expect(esHuecoConocido('inventado')).toBe(false)
    expect(esHuecoConocido(undefined)).toBe(false)
  })
})
