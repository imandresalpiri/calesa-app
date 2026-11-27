import { describe, expect, it } from 'vitest'
import {
  CONTENEDORES,
  textoDeConteo,
  textoDeFaltan,
  textoDeLaLlegada,
  textoDelZarpe,
  textoDeVehiculos,
  VEHICULOS,
} from './textos'

describe('textoDeConteo', () => {
  it('dice el número con su tope y el sustantivo', () => {
    expect(textoDeConteo({ n: 1, hayMas: false }, VEHICULOS)).toBe('1 vehículo')
    expect(textoDeConteo({ n: 0, hayMas: false }, CONTENEDORES)).toBe('0 contenedores')
    expect(textoDeConteo({ n: 100, hayMas: true }, CONTENEDORES)).toBe('100+ contenedores')
  })
})

describe('textoDeFaltan', () => {
  it('cuenta los que tienen algo que falta, con tope', () => {
    expect(textoDeFaltan({ n: 2, hayMas: false })).toBe('2 con algo que falta')
    expect(textoDeFaltan({ n: 10, hayMas: true })).toBe('10+ con algo que falta')
  })

  it('sin ninguno evaluado pero con más sin evaluar, pide revisar; sin ninguno, nada', () => {
    expect(textoDeFaltan({ n: 0, hayMas: true })).toBe('Revisar qué falta')
    expect(textoDeFaltan({ n: 0, hayMas: false })).toBeNull()
  })
})

describe('las fechas y los vehículos de la fila', () => {
  const dia = (f: string) => `día ${f}`
  it('el zarpe real manda; si no, el estimado', () => {
    expect(textoDelZarpe({ zarpeEl: '2026-11-02', zarpeEstimadoEl: '2026-11-01' }, dia)).toBe(
      'día 2026-11-02',
    )
    expect(textoDelZarpe({ zarpeEl: null, zarpeEstimadoEl: '2026-11-01' }, dia)).toBe(
      'día 2026-11-01 (estimado)',
    )
    expect(textoDelZarpe({ zarpeEl: null, zarpeEstimadoEl: null }, dia)).toBeNull()
  })

  it('el arribo manda sobre la ETA', () => {
    expect(textoDeLaLlegada({ etaEl: '2026-12-01', arriboEl: '2026-12-03' }, dia)).toBe(
      'Llegó el día 2026-12-03',
    )
    expect(textoDeLaLlegada({ etaEl: '2026-12-01', arriboEl: null }, dia)).toBe(
      'ETA día 2026-12-01',
    )
    expect(textoDeLaLlegada({ etaEl: null, arriboEl: null }, dia)).toBeNull()
  })

  it('los ocultos se dicen', () => {
    expect(textoDeVehiculos({ n: 3, hayMas: false }, true)).toBe(
      '3 vehículos y otros que no puedes ver',
    )
    expect(textoDeVehiculos({ n: 1, hayMas: false }, false)).toBe('1 vehículo')
  })
})
