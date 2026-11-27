import { describe, expect, it } from 'vitest'
import { pideSaberSiEstaPagada, resumenDeAduana, type DeclaracionDelResumen } from './resumen'

const HOY = '2026-11-27'
const ORIGEN = '00000000-0000-4000-8000-0000000000a1'
const declaracion = (extra: Partial<DeclaracionDelResumen> = {}): DeclaracionDelResumen => ({
  id: '00000000-0000-4000-8000-0000000000d1',
  numero: 'DUI-1',
  canal: 'verde',
  venceTributosEl: null,
  ...extra,
})

describe('resumenDeAduana', () => {
  it('sin declaración', () => {
    const r = resumenDeAduana({ declaracion: null, pagada: null, hoy: HOY, origenId: ORIGEN })
    expect(r.lineas).toEqual(['Sin declaración.'])
    expect(r.acciones).toHaveLength(1)
  })

  it('con canal y sin vencimiento cercano: sin aviso, con su pantalla en el origen', () => {
    const r = resumenDeAduana({
      declaracion: declaracion(),
      pagada: null,
      hoy: HOY,
      origenId: ORIGEN,
    })
    expect(r.lineas).toEqual(['Declaración DUI-1 · Verde'])
    expect(r.aviso).toBeNull()
    expect(JSON.stringify(r.acciones[1]?.destino)).toContain(`origen=${ORIGEN}`)
  })

  it('avisa lo que vence pronto o venció, salvo si está pagada', () => {
    const pronto = declaracion({ venceTributosEl: '2026-11-29' })
    expect(
      resumenDeAduana({ declaracion: pronto, pagada: false, hoy: HOY, origenId: ORIGEN }).aviso,
    ).toBe('Vence en 2 días')
    expect(
      resumenDeAduana({ declaracion: pronto, pagada: true, hoy: HOY, origenId: ORIGEN }).aviso,
    ).toBeNull()
    const vencida = declaracion({ venceTributosEl: '2026-11-20' })
    expect(
      resumenDeAduana({ declaracion: vencida, pagada: null, hoy: HOY, origenId: ORIGEN }).aviso,
    ).toMatch(/^Vencida el/)
  })

  it('sólo pregunta si está pagada cuando avisaría', () => {
    expect(pideSaberSiEstaPagada(null, HOY)).toBe(false)
    expect(pideSaberSiEstaPagada('2027-03-01', HOY)).toBe(false)
    expect(pideSaberSiEstaPagada('2026-11-30', HOY)).toBe(true)
    expect(pideSaberSiEstaPagada('2026-11-01', HOY)).toBe(true)
  })
})
