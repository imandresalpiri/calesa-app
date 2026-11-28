import { describe, expect, it } from 'vitest'
import { esLaPorDefecto, porDefectoDelLugar, queSeComparte } from './por-defecto'
import type { PorDefecto } from './tipos'

const ORIGEN = 'origen-a'
const OTRO_ORIGEN = 'origen-b'
const POR_DEFECTO: PorDefecto = {
  origenId: ORIGEN,
  tipo: 'imagen',
  plantillaId: 'p1',
  actualizadoEn: '2026-11-27T10:00:00.123456+00:00',
}
const VISIBLE = { id: 'p1', formato: 'vertical' as const, origenId: ORIGEN }

describe('queSeComparte', () => {
  it('con la elegida visible, la plantilla', () => {
    expect(
      queSeComparte({
        porDefecto: POR_DEFECTO,
        plantillaVisible: VISIBLE,
        origenId: ORIGEN,
        tipo: 'imagen',
      }),
    ).toEqual({ tipo: 'plantilla', plantillaId: 'p1' })
  })

  it('sin elegir, lo de hoy', () => {
    expect(
      queSeComparte({ porDefecto: null, plantillaVisible: null, origenId: ORIGEN, tipo: 'imagen' }),
    ).toEqual({ tipo: 'de-hoy', cual: 'imagen' })
    expect(
      queSeComparte({ porDefecto: null, plantillaVisible: null, origenId: ORIGEN, tipo: 'pdf' }),
    ).toEqual({
      tipo: 'de-hoy',
      cual: 'pdf',
    })
  })

  it('si ya no se ve, lo de hoy', () => {
    expect(
      queSeComparte({
        porDefecto: POR_DEFECTO,
        plantillaVisible: null,
        origenId: ORIGEN,
        tipo: 'imagen',
      }),
    ).toEqual({ tipo: 'de-hoy', cual: 'imagen' })
  })

  it('si es de otro tipo, otro origen u otra plantilla, lo de hoy', () => {
    const deHoy = { tipo: 'de-hoy', cual: 'imagen' }
    expect(
      queSeComparte({
        porDefecto: POR_DEFECTO,
        plantillaVisible: { ...VISIBLE, formato: 'a4' },
        origenId: ORIGEN,
        tipo: 'imagen',
      }),
    ).toEqual(deHoy)
    expect(
      queSeComparte({
        porDefecto: POR_DEFECTO,
        plantillaVisible: { ...VISIBLE, origenId: OTRO_ORIGEN },
        origenId: ORIGEN,
        tipo: 'imagen',
      }),
    ).toEqual(deHoy)
    expect(
      queSeComparte({
        porDefecto: POR_DEFECTO,
        plantillaVisible: { ...VISIBLE, id: 'p2' },
        origenId: ORIGEN,
        tipo: 'imagen',
      }),
    ).toEqual(deHoy)
    expect(
      queSeComparte({
        porDefecto: POR_DEFECTO,
        plantillaVisible: VISIBLE,
        origenId: OTRO_ORIGEN,
        tipo: 'imagen',
      }),
    ).toEqual(deHoy)
  })
})

describe('esLaPorDefecto', () => {
  it('encuentra la fila de la plantilla en su origen y tipo', () => {
    expect(esLaPorDefecto([POR_DEFECTO], VISIBLE)).toEqual(POR_DEFECTO)
    expect(esLaPorDefecto([POR_DEFECTO], { ...VISIBLE, id: 'p2' })).toBeNull()
    expect(esLaPorDefecto([POR_DEFECTO], { ...VISIBLE, formato: 'carta' })).toBeNull()
  })

  it('el lugar ocupado de un origen y tipo', () => {
    expect(porDefectoDelLugar([POR_DEFECTO], ORIGEN, 'imagen')).toEqual(POR_DEFECTO)
    expect(porDefectoDelLugar([POR_DEFECTO], ORIGEN, 'pdf')).toBeNull()
  })
})
