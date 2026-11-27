import { describe, expect, it } from 'vitest'
import { paginaDeContenedoresDesde, paginaDeEmbarquesDesde } from './lista-de-embarques'

const E = '8c3f5d3e-8c2b-4a7e-9f10-2b3c4d5e6f72'
const C = '7b2f5d3e-8c2b-4a7e-9f10-2b3c4d5e6f71'
const T = '2026-11-26T10:00:00+00:00'
const lleva = {
  vehiculos: { n: 3, hay_mas: false },
  hay_ocultos: false,
  faltan: { n: 0, hay_mas: true },
}

describe('paginaDeEmbarquesDesde', () => {
  it('lee cada embarque con sus conteos acotados y el cursor', () => {
    const p = paginaDeEmbarquesDesde({
      embarques: [
        {
          id: E,
          booking: 'BK1',
          naviera_id: null,
          puerto_origen_id: null,
          puerto_destino_id: null,
          zarpe_estimado_el: null,
          zarpe_el: null,
          eta_el: null,
          arribo_el: null,
          actualizado_en: T,
          estado: 'armandose',
          contenedores: { n: 100, hay_mas: true },
          ...lleva,
        },
      ],
      siguiente: E,
      cortada: false,
    })
    expect(p?.siguiente).toBe(E)
    expect(p?.filas[0]).toMatchObject({
      booking: 'BK1',
      contenedores: { n: 100, hayMas: true },
      vehiculos: { n: 3, hayMas: false },
      faltan: { n: 0, hayMas: true },
    })
  })

  it('una forma distinta da nulo', () => {
    expect(
      paginaDeEmbarquesDesde({ embarques: [{ id: 'x' }], siguiente: null, cortada: false }),
    ).toBeNull()
  })
})

describe('paginaDeContenedoresDesde', () => {
  it('lee el contenedor con su embarque o sin él', () => {
    const fila = {
      id: C,
      numero: 'MSCU1234',
      tipo: null,
      tipo_nombre: null,
      sello: null,
      actualizado_en: T,
      estado: 'sin_embarque',
      embarque: null,
      eta_el: null,
      ...lleva,
    }
    const p = paginaDeContenedoresDesde({
      contenedores: [fila, { ...fila, estado: 'llego', embarque: { id: E, booking: 'BK1' } }],
      siguiente: null,
      cortada: true,
    })
    expect(p?.cortada).toBe(true)
    expect(p?.filas.map((f) => [f.estado, f.embarque?.booking ?? null])).toEqual([
      ['sin_embarque', null],
      ['llego', 'BK1'],
    ])
  })
})
