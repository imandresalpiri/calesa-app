import { describe, expect, it } from 'vitest'
import {
  borradorDelContenedor,
  borradorDelEmbarque,
  cambiosDe,
  validarContenedor,
  validarEmbarque,
} from './borrador-del-embarque'

const NAVIERA = '11111111-1111-4111-8111-111111111111'
const EMBARQUE = '22222222-2222-4222-8222-222222222222'

describe('el borrador del embarque', () => {
  it('nuevo, todo vacío; el booking es obligatorio', () => {
    const r = validarEmbarque(borradorDelEmbarque(null))
    expect(r).toEqual({ ok: false, errores: { booking: 'Escribe el booking.' } })
  })

  it('el booking va sin espacios y en mayúsculas; lo vacío, nulo', () => {
    const r = validarEmbarque({
      ...borradorDelEmbarque(null),
      booking: ' bk 12/3 ',
      naviera: NAVIERA,
    })
    expect(r.ok && r.datos).toEqual({
      booking: 'BK12/3',
      naviera_id: NAVIERA,
      puerto_origen_id: null,
      puerto_destino_id: null,
      zarpe_estimado_el: null,
      zarpe_el: null,
      eta_el: null,
      arribo_el: null,
      notas: null,
    })
  })

  it('una forma rara o fechas al revés se avisan en su campo', () => {
    const r = validarEmbarque({
      ...borradorDelEmbarque(null),
      booking: 'bk#1',
      zarpe: '2026-11-20',
      arribo: '2026-11-10',
      eta: '2026-11-01',
    })
    expect(r.ok ? {} : Object.keys(r.errores).sort()).toEqual(['arribo_el', 'booking', 'eta_el'])
  })

  it('sin zarpe real, la ETA se compara con el estimado', () => {
    const r = validarEmbarque({
      ...borradorDelEmbarque(null),
      booking: 'BK1',
      zarpeEstimado: '2026-12-01',
      eta: '2026-11-30',
    })
    expect(r.ok).toBe(false)
  })
})

describe('cambiosDe', () => {
  it('sólo lo que cambió; nada, nulo', () => {
    expect(
      cambiosDe<{ booking: string; notas: string | null }>(
        { booking: 'A', notas: null },
        { booking: 'A', notas: 'x' },
      ),
    ).toEqual({
      notas: 'x',
    })
    expect(
      cambiosDe<{ booking: string; notas: string | null }>(
        { booking: 'A' },
        { booking: 'A', notas: null },
      ),
    ).toBeNull()
  })
})

describe('el borrador del contenedor', () => {
  it('nace con el embarque desde el que se agrega', () => {
    expect(borradorDelContenedor(null, EMBARQUE).embarque).toBe(EMBARQUE)
  })

  it('el número es obligatorio y va normalizado; sin embarque es nulo', () => {
    expect(validarContenedor(borradorDelContenedor(null)).ok).toBe(false)
    const r = validarContenedor({
      ...borradorDelContenedor(null),
      numero: 'mscu 123',
      tipo: '40HC',
    })
    expect(r.ok && r.datos).toEqual({
      numero: 'MSCU123',
      tipo: '40HC',
      sello: null,
      embarque_id: null,
      notas: null,
    })
  })

  it('un sello largo se avisa', () => {
    const r = validarContenedor({
      ...borradorDelContenedor(null),
      numero: 'MSCU1',
      sello: 'x'.repeat(41),
    })
    expect(r.ok ? null : r.errores['sello']).toBe('El sello lleva hasta 40 caracteres.')
  })
})
