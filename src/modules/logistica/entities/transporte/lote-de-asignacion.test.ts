import { describe, expect, it } from 'vitest'
import type { UnidadBuscada } from '../nucleo/unidad-buscada'
import {
  enOtroDestino,
  marcaDeOtroDestino,
  mensajeDeMover,
  otroDestinoDe,
  unidadesParaAsignar,
} from './lote-de-asignacion'

const C = '7b2f5d3e-8c2b-4a7e-9f10-2b3c4d5e6f71'
const C2 = '7b2f5d3e-8c2b-4a7e-9f10-2b3c4d5e6f79'
const E = '8c3f5d3e-8c2b-4a7e-9f10-2b3c4d5e6f72'
const E2 = '8c3f5d3e-8c2b-4a7e-9f10-2b3c4d5e6f78'

function unidad(cambios: Partial<UnidadBuscada> = {}): UnidadBuscada {
  return {
    id: '6a1f5d3e-8c2b-4a7e-9f10-2b3c4d5e6f70',
    titulo: 'Toyota Hilux',
    vin: null,
    lote: null,
    fase: null,
    contenedorId: null,
    contenedor: null,
    embarqueId: null,
    booking: null,
    transporteActualizadoEn: null,
    ...cambios,
  }
}

describe('unidadesParaAsignar', () => {
  it('manda cada vehículo con la versión de su transporte, nula si no tiene', () => {
    expect(
      unidadesParaAsignar([
        unidad(),
        unidad({ id: C, transporteActualizadoEn: '2026-11-26T10:00:00Z' }),
      ]),
    ).toEqual([
      { vehiculoId: '6a1f5d3e-8c2b-4a7e-9f10-2b3c4d5e6f70', actualizadoEn: null },
      { vehiculoId: C, actualizadoEn: '2026-11-26T10:00:00Z' },
    ])
  })
})

describe('otroDestinoDe', () => {
  const alContenedor = { tipo: 'contenedor', id: C, embarqueId: E } as const
  const alEmbarque = { tipo: 'embarque', id: E } as const

  it('una suelta, o que ya va en el destino, no pregunta', () => {
    expect(otroDestinoDe(unidad(), alContenedor)).toBeNull()
    expect(otroDestinoDe(unidad({ contenedorId: C, embarqueId: E }), alContenedor)).toBeNull()
    expect(otroDestinoDe(unidad({ contenedorId: C, embarqueId: E }), alEmbarque)).toBeNull()
  })

  it('directa en el embarque del contenedor entra sin preguntar; en otro embarque, pregunta', () => {
    expect(otroDestinoDe(unidad({ embarqueId: E }), alContenedor)).toBeNull()
    expect(otroDestinoDe(unidad({ embarqueId: E2, booking: 'BK2' }), alContenedor)).toEqual({
      tipo: 'embarque',
      nombre: 'BK2',
    })
  })

  it('en otro contenedor pregunta y lo nombra, también con destino un embarque', () => {
    const enOtro = unidad({ contenedorId: C2, contenedor: 'TGHU5678', embarqueId: E2 })
    expect(otroDestinoDe(enOtro, alContenedor)).toEqual({ tipo: 'contenedor', nombre: 'TGHU5678' })
    expect(otroDestinoDe(enOtro, alEmbarque)).toEqual({ tipo: 'contenedor', nombre: 'TGHU5678' })
    expect(otroDestinoDe(unidad({ contenedorId: C2, contenedor: 'X' }), alEmbarque)).toEqual({
      tipo: 'contenedor',
      nombre: 'X',
    })
  })

  it('enOtroDestino deja sólo las que hay que mudar', () => {
    const lote = [unidad(), unidad({ contenedorId: C2, contenedor: 'TGHU5678' })]
    expect(enOtroDestino(lote, alContenedor).map((o) => o.en.nombre)).toEqual(['TGHU5678'])
  })
})

describe('los textos', () => {
  it('la marca del buscador nombra el contenedor o el embarque', () => {
    expect(marcaDeOtroDestino({ tipo: 'contenedor', nombre: 'MSCU1234' })).toBe(
      'Está en el contenedor «MSCU1234»',
    )
    expect(marcaDeOtroDestino({ tipo: 'embarque', nombre: 'BK1' })).toBe(
      'Está en el embarque «BK1»',
    )
  })

  it('la pregunta cuenta los vehículos y nombra cada destino una vez', () => {
    expect(
      mensajeDeMover([
        { en: { tipo: 'contenedor', nombre: 'MSCU1234' } },
        { en: { tipo: 'contenedor', nombre: 'TGHU5678' } },
        { en: { tipo: 'contenedor', nombre: 'MSCU1234' } },
      ]),
    ).toBe('3 vehículos ya van en otro contenedor (MSCU1234, TGHU5678). ¿Moverlos a éste?')
    expect(mensajeDeMover([{ en: { tipo: 'embarque', nombre: 'BK1' } }])).toBe(
      '1 vehículo ya va en otro embarque (BK1). ¿Moverlo a éste?',
    )
    expect(
      mensajeDeMover([
        { en: { tipo: 'embarque', nombre: 'BK1' } },
        { en: { tipo: 'contenedor', nombre: 'X' } },
      ]),
    ).toBe('2 vehículos ya van en otro contenedor o embarque (BK1, X). ¿Moverlos a éste?')
    const cinco = ['A', 'B', 'C', 'D', 'E'].map((nombre) => ({
      en: { tipo: 'contenedor' as const, nombre },
    }))
    expect(mensajeDeMover(cinco)).toBe(
      '5 vehículos ya van en otro contenedor (A, B, C y 2 más). ¿Moverlos a éste?',
    )
  })
})
