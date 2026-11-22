import { describe, expect, it } from 'vitest'
import { filtroDelCursorDeTurnos } from './cursor-de-turnos'

const ID = '0b7c1c3e-6d0e-4d57-9f0e-5e6f3c1a2b3c'
const T = '2026-11-12T13:00:00.000Z'

describe('filtroDelCursorDeTurnos', () => {
  it('una vigente con hora: las que vencen después, las del mismo instante con id mayor y las directas', () => {
    const filtro = filtroDelCursorDeTurnos({ grupo: 'asignada', venceEn: T, id: ID })
    expect(filtro).toContain('vence_en.gt.')
    expect(filtro).toContain('and(vence_en.eq.')
    expect(filtro).toContain(`id.gt.`)
    expect(filtro).toContain('vence_en.is.null')
    expect(filtro).toContain(ID)
  })

  it('una directa (sin hora): sólo las directas con id mayor', () => {
    const filtro = filtroDelCursorDeTurnos({ grupo: 'asignada', venceEn: null, id: ID })
    expect(filtro).toBe(`and(vence_en.is.null,id.gt."${ID}")`)
  })

  it('una vencida: las que vencieron antes, las del mismo instante con id mayor y las sin hora al final', () => {
    const filtro = filtroDelCursorDeTurnos({ grupo: 'vencida', venceEn: T, id: ID })
    expect(filtro).toContain('vence_en.lt.')
    expect(filtro).toContain('and(vence_en.eq.')
    expect(filtro).not.toContain('vence_en.gt.')
    expect(filtro.endsWith('vence_en.is.null')).toBe(true)
  })

  it('una vencida sin hora: sólo las que tampoco tienen, con id mayor', () => {
    const filtro = filtroDelCursorDeTurnos({ grupo: 'vencida', venceEn: null, id: ID })
    expect(filtro).toBe(`and(vence_en.is.null,id.gt."${ID}")`)
  })
})
