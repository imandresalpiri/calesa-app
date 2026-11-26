import { describe, expect, it } from 'vitest'
import {
  ESTADOS_DEL_CONTENEDOR,
  estadoDelContenedor,
  estadoDelEmbarque,
  TEXTO_DEL_ESTADO,
} from './estado'

const base = {
  zarpeEl: null,
  arriboEl: null,
  hayUnidades: true,
  todasEnFaseFinal: false,
  hoy: '2026-11-26',
}

describe('estadoDelEmbarque', () => {
  it('sin fechas está armándose', () => {
    expect(estadoDelEmbarque(base)).toBe('armandose')
  })

  it('con un zarpe futuro sigue armándose; hasta hoy, en tránsito', () => {
    expect(estadoDelEmbarque({ ...base, zarpeEl: '2026-11-27' })).toBe('armandose')
    expect(estadoDelEmbarque({ ...base, zarpeEl: '2026-11-26' })).toBe('en_transito')
    expect(estadoDelEmbarque({ ...base, zarpeEl: '2026-10-01' })).toBe('en_transito')
  })

  it('con arribo llegó, aunque no tenga zarpe', () => {
    expect(estadoDelEmbarque({ ...base, arriboEl: '2026-11-20' })).toBe('llego')
    expect(estadoDelEmbarque({ ...base, zarpeEl: '2026-10-01', arriboEl: '2026-11-20' })).toBe(
      'llego',
    )
  })

  it('entregado manda sobre las fechas, pero sólo con unidades', () => {
    expect(estadoDelEmbarque({ ...base, arriboEl: '2026-11-20', todasEnFaseFinal: true })).toBe(
      'entregado',
    )
    expect(estadoDelEmbarque({ ...base, hayUnidades: false, todasEnFaseFinal: true })).toBe(
      'armandose',
    )
  })
})

describe('estadoDelContenedor', () => {
  it('sin embarque es «Sin embarque»; con él, la regla del embarque', () => {
    expect(estadoDelContenedor({ conEmbarque: false })).toBe('sin_embarque')
    expect(estadoDelContenedor({ ...base, conEmbarque: true, zarpeEl: '2026-11-01' })).toBe(
      'en_transito',
    )
  })

  it('cada estado tiene su nombre del glosario', () => {
    expect(ESTADOS_DEL_CONTENEDOR.map((e) => TEXTO_DEL_ESTADO[e])).toEqual([
      'Armándose',
      'En tránsito',
      'Llegó',
      'Entregado',
      'Sin embarque',
    ])
  })
})
