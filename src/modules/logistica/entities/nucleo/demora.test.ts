import { describe, expect, it } from 'vitest'
import { demoraDeLaUnidad, diasDeDemoraDeLaFase, type PedidoDeDemora } from './demora'

const ahora = new Date('2026-11-27T12:00:00Z')
const fase = { esLogistica: true, esFinal: false, demoraDias: 7 }
const base: PedidoDeDemora = {
  faseDesde: '2026-11-10T12:00:00Z',
  fase,
  demoraPorDefecto: 30,
  reglaDeDemoraActiva: true,
  situacion: 'fase',
  ahora,
}

describe('demora de la unidad (espejo de _logistica_dias)', () => {
  it('está demorada si entró hace más de los días de su fase', () => {
    expect(demoraDeLaUnidad(base)).toEqual({ dias: 7 })
  })

  it('sin la regla alerta_demora, en una final o fuera de logística, no alerta', () => {
    expect(demoraDeLaUnidad({ ...base, reglaDeDemoraActiva: false })).toBeNull()
    expect(demoraDeLaUnidad({ ...base, fase: { ...fase, esFinal: true } })).toBeNull()
    expect(demoraDeLaUnidad({ ...base, fase: { ...fase, esLogistica: false } })).toBeNull()
    expect(demoraDeLaUnidad({ ...base, fase: null })).toBeNull()
  })

  it('sin días propios usa los de la empresa, y 0 o nada no alerta', () => {
    expect(diasDeDemoraDeLaFase({ ...fase, demoraDias: null }, 30, true)).toBe(30)
    expect(demoraDeLaUnidad({ ...base, fase: { ...fase, demoraDias: null } })).toBeNull()
    expect(
      demoraDeLaUnidad({ ...base, fase: { ...fase, demoraDias: null }, demoraPorDefecto: 10 }),
    ).toEqual({ dias: 10 })
    expect(diasDeDemoraDeLaFase({ ...fase, demoraDias: 0 }, 30, true)).toBeNull()
    expect(diasDeDemoraDeLaFase({ ...fase, demoraDias: null }, null, true)).toBeNull()
  })

  it('una subasta no ganada no cuenta, ni una unidad sin fecha de entrada', () => {
    expect(demoraDeLaUnidad({ ...base, situacion: 'no_ganada' })).toBeNull()
    expect(demoraDeLaUnidad({ ...base, faseDesde: null })).toBeNull()
    expect(demoraDeLaUnidad({ ...base, faseDesde: 'no es fecha' })).toBeNull()
  })

  it('el borde: justo los días no es demora; un instante más, sí', () => {
    expect(demoraDeLaUnidad({ ...base, faseDesde: '2026-11-20T12:00:00Z' })).toBeNull()
    expect(demoraDeLaUnidad({ ...base, faseDesde: '2026-11-20T11:59:59Z' })).toEqual({ dias: 7 })
  })
})
