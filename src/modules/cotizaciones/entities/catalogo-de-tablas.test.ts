import { describe, expect, it } from 'vitest'
import { catalogoDe, tablasParaElCompilador, type ColumnaDelCatalogo } from './catalogo-de-tablas'

const columnas = (claves: string[]): ColumnaDelCatalogo[] =>
  claves.map((clave) => ({ clave, etiqueta: clave.toUpperCase(), tipo: 'numero' }))
const tabla = (id: string, clave: string, compartida: boolean, claves: string[]) => ({
  id,
  clave,
  nombre: `Tabla ${clave}`,
  compartida,
  columnas: columnas(claves),
})

describe('catalogoDe', () => {
  it('una tabla del origen tapa a la compartida de la misma clave, llegue antes o después', () => {
    const propia = tabla('a', 'fletes', false, ['desde', 'hasta', 'monto'])
    const compartida = tabla('b', 'fletes', true, ['monto'])
    expect(catalogoDe([propia, compartida])).toEqual([propia])
    expect(catalogoDe([compartida, propia])).toEqual([propia])
  })

  it('las demás quedan, en su orden; sin tablas, ninguna', () => {
    const tablas = [
      tabla('a', 'aranceles', true, ['anio', 'tasa']),
      tabla('b', 'fletes', false, ['monto']),
    ]
    expect(catalogoDe(tablas).map((t) => t.clave)).toEqual(['aranceles', 'fletes'])
    expect(catalogoDe([])).toEqual([])
  })
})

describe('tablasParaElCompilador', () => {
  it('la clave y las claves de las columnas de cada tabla; nulo si no se leyó', () => {
    expect(tablasParaElCompilador([tabla('a', 'fletes', false, ['desde', 'monto'])])).toEqual([
      { clave: 'fletes', columnas: ['desde', 'monto'] },
    ])
    expect(tablasParaElCompilador(null)).toBeNull()
  })
})
