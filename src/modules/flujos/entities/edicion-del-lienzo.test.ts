import { describe, expect, it } from 'vitest'
import {
  edicionDelLienzo,
  leidaNoAntesDe,
  MOTIVO_EN_EL_CELULAR,
  MOTIVO_SIN_CREAR_AQUI,
  MOTIVO_SIN_MOVER_AQUI,
  MOTIVO_SIN_VINCULAR_AQUI,
  versionVigente,
} from './edicion-del-lienzo'

const fases = { motivoDeMover: null, motivoDeNuevaFase: null }

describe('edicionDelLienzo', () => {
  it('en escritorio, con los dos proveedores, todo se puede', () => {
    expect(edicionDelLienzo({ fases, conSalidas: true, angosto: false })).toEqual({
      mover: null,
      vincular: null,
      crear: null,
    })
  })

  it('en el celular no se mueve ni se vincula, pero se crea', () => {
    expect(edicionDelLienzo({ fases, conSalidas: true, angosto: true })).toEqual({
      mover: MOTIVO_EN_EL_CELULAR,
      vincular: MOTIVO_EN_EL_CELULAR,
      crear: null,
    })
  })

  it('con la lista cortada no se mueve, y se vincula; con el tope, no se crea', () => {
    const e = edicionDelLienzo({
      fases: { motivoDeMover: 'cortada', motivoDeNuevaFase: 'tope' },
      conSalidas: true,
      angosto: false,
    })
    expect(e).toEqual({ mover: 'cortada', vincular: null, crear: 'tope' })
  })

  it('sin proveedores, todo apagado', () => {
    expect(edicionDelLienzo({ fases: null, conSalidas: false, angosto: false })).toEqual({
      mover: MOTIVO_SIN_MOVER_AQUI,
      vincular: MOTIVO_SIN_VINCULAR_AQUI,
      crear: MOTIVO_SIN_CREAR_AQUI,
    })
  })
})

describe('versionVigente', () => {
  const leida = '2026-11-10T14:03:22.123456+00:00'
  it('sin escritura propia, la leída', () => {
    expect(versionVigente(leida, null)).toBe(leida)
  })

  it('la propia, si es más nueva que la leída, aunque difiera sólo en microsegundos', () => {
    const propia = '2026-11-10T14:03:22.123457+00:00'
    expect(versionVigente(leida, propia)).toBe(propia)
  })

  it('la leída, cuando llega una más nueva que la propia', () => {
    expect(versionVigente('2026-11-10T14:05:00+00:00', leida)).toBe('2026-11-10T14:05:00+00:00')
  })

  it('compara instantes, no textos: otra zona horaria', () => {
    expect(versionVigente('2026-11-10T10:03:22.5-04:00', '2026-11-10T14:03:22.4+00:00')).toBe(
      '2026-11-10T10:03:22.5-04:00',
    )
  })
})

describe('leidaNoAntesDe', () => {
  it('igual o posterior', () => {
    expect(leidaNoAntesDe('2026-11-10T14:03:22.1+00:00', '2026-11-10T14:03:22.1+00:00')).toBe(true)
    expect(leidaNoAntesDe('2026-11-10T14:03:22.2+00:00', '2026-11-10T14:03:22.1+00:00')).toBe(true)
    expect(leidaNoAntesDe('2026-11-10T14:03:22.1+00:00', '2026-11-10T14:03:22.2+00:00')).toBe(false)
  })
})
