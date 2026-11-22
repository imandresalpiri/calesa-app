import { describe, expect, it } from 'vitest'
import type { Nodo } from '../../../../entities/nodos'
import { esMontoQueSeEscribe } from './monto-secreto'

const remate = { id: 'remate', tipo: 'input', etiqueta: 'Remate', formato: 'usd' } as Nodo
const fees = { id: 'fees', tipo: 'constante', etiqueta: 'Fees', formato: 'usd' } as Nodo
const cif = { id: 'cif', tipo: 'calculo', etiqueta: 'CIF', formato: 'usd' } as Nodo
const anios = { id: 'anios', tipo: 'input', etiqueta: 'Años', formato: 'raw' } as Nodo

describe('esMontoQueSeEscribe (Modo Live)', () => {
  it('el valor fijo se esconde en C y lo que escribe el asesor en Ejemplo, si son dinero', () => {
    expect(esMontoQueSeEscribe(fees, 'C')).toBe(true)
    expect(esMontoQueSeEscribe(remate, 'D')).toBe(true)
  })

  it('no en la otra columna, en un cálculo ni en lo que no es dinero', () => {
    expect(esMontoQueSeEscribe(remate, 'C')).toBe(false)
    expect(esMontoQueSeEscribe(fees, 'D')).toBe(false)
    expect(esMontoQueSeEscribe(cif, 'C')).toBe(false)
    expect(esMontoQueSeEscribe(anios, 'D')).toBe(false)
  })
})
