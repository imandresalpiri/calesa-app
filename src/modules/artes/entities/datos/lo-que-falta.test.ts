import { describe, expect, it } from 'vitest'
import type { Falta } from './capas-con-datos'
import { claveDeLoQueFalta, textoDeLoQueFalta, TOPE_DE_LO_QUE_FALTA } from './lo-que-falta'

const faltas = (...nombres: string[]): Falta[] =>
  nombres.map((nombre, i) => ({ clave: `c${String(i)}`, nombre }))

describe('el aviso de lo que falta', () => {
  it('sin nada que falte, no hay aviso', () => {
    expect(textoDeLoQueFalta([])).toBeNull()
  })

  it('uno, dos y varios', () => {
    expect(textoDeLoQueFalta(faltas('el VIN'))).toBe(
      'A esta plantilla le faltan datos con este vehículo: el VIN.',
    )
    expect(textoDeLoQueFalta(faltas('la foto 3', 'el VIN'))).toBe(
      'A esta plantilla le faltan datos con este vehículo: la foto 3 y el VIN.',
    )
    expect(textoDeLoQueFalta(faltas('la foto 3', 'el VIN', 'la cotización'))).toBe(
      'A esta plantilla le faltan datos con este vehículo: la foto 3, el VIN y la cotización.',
    )
  })

  it(`con más de ${String(TOPE_DE_LO_QUE_FALTA)}, los primeros y «y N más»`, () => {
    expect(textoDeLoQueFalta(faltas('a', 'b', 'c', 'd', 'e'))).toBe(
      'A esta plantilla le faltan datos con este vehículo: a, b, c, d y e.',
    )
    expect(textoDeLoQueFalta(faltas('a', 'b', 'c', 'd', 'e', 'f', 'g'))).toBe(
      'A esta plantilla le faltan datos con este vehículo: a, b, c, d, e y 2 más.',
    )
  })

  it('la clave cambia sólo si cambia lo que falta', () => {
    expect(claveDeLoQueFalta(faltas('a', 'b'))).toBe(claveDeLoQueFalta(faltas('x', 'y')))
    expect(claveDeLoQueFalta(faltas('a'))).not.toBe(claveDeLoQueFalta(faltas('a', 'b')))
    expect(claveDeLoQueFalta([])).toBe('')
  })
})
