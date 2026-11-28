import { describe, expect, it } from 'vitest'
import {
  textoConValores,
  textoDeVariablesDesconocidas,
  VARIABLES_DE_ARTE,
  variablesDesconocidas,
} from './variables'

describe('llenar las variables de un texto', () => {
  it('cambia cada variable conocida por su valor', () => {
    const valores = { marca: 'Toyota', modelo: 'Hilux', anio: '2021' }
    expect(textoConValores('{marca} {modelo} · {anio}', valores)).toBe('Toyota Hilux · 2021')
  })

  it('una desconocida, o una conocida sin valor, queda tal cual', () => {
    expect(textoConValores('{precio} y {lote}', { marca: 'Toyota' })).toBe('{precio} y {lote}')
  })

  it('un valor con llaves o con $& no se expande', () => {
    const valores = { marca: '{modelo}', modelo: '$&' }
    expect(textoConValores('{marca} {modelo}', valores)).toBe('{modelo} $&')
  })

  it('no hay variables de dinero', () => {
    const claves = VARIABLES_DE_ARTE.map((v) => v.clave)
    expect(claves).not.toContain('precio')
    expect(claves).not.toContain('monto')
    expect(new Set(claves).size).toBe(claves.length)
  })
})

describe('las variables desconocidas', () => {
  it('sin repetir y en su orden', () => {
    expect(variablesDesconocidas('{x} {marca} {y} {x}')).toEqual(['x', 'y'])
    expect(variablesDesconocidas('Hola {vehiculo}')).toEqual([])
  })

  it('el aviso, con una y con varias', () => {
    expect(textoDeVariablesDesconocidas([])).toBeNull()
    expect(textoDeVariablesDesconocidas(['x'])).toBe('{x} no es un dato que el arte pueda llenar.')
    expect(textoDeVariablesDesconocidas(['x', 'y', 'z'])).toBe(
      '{x}, {y} y {z} no son datos que el arte pueda llenar.',
    )
  })
})
