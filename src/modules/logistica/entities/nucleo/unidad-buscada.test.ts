import { describe, expect, it } from 'vitest'
import { unidadesBuscadasDesde } from './unidad-buscada'

const ID = '6a1f5d3e-8c2b-4a7e-9f10-2b3c4d5e6f70'
const C = '7b2f5d3e-8c2b-4a7e-9f10-2b3c4d5e6f71'
const E = '8c3f5d3e-8c2b-4a7e-9f10-2b3c4d5e6f72'

describe('unidadesBuscadasDesde', () => {
  it('toma el título, el VIN, el lote, la fase, dónde va, la versión de su transporte y si hay más', () => {
    expect(
      unidadesBuscadasDesde({
        unidades: [
          {
            id: ID,
            origen_id: ID,
            titulo: 'Toyota Hilux',
            vin: 'VIN1',
            lote: null,
            fase_id: null,
            fase_nombre: 'Puerto',
            contenedor_id: C,
            contenedor: 'MSCU1234',
            embarque_id: E,
            booking: 'BK1',
            transporte_actualizado_en: '2026-11-26T10:00:00+00:00',
          },
        ],
        hay_mas: true,
      }),
    ).toEqual({
      hayMas: true,
      unidades: [
        {
          id: ID,
          titulo: 'Toyota Hilux',
          vin: 'VIN1',
          lote: null,
          fase: 'Puerto',
          contenedorId: C,
          contenedor: 'MSCU1234',
          embarqueId: E,
          booking: 'BK1',
          transporteActualizadoEn: '2026-11-26T10:00:00+00:00',
        },
      ],
    })
  })

  it('una forma distinta no se descarta en silencio: da nulo', () => {
    expect(unidadesBuscadasDesde({ unidades: [{ id: 'x' }], hay_mas: false })).toBeNull()
    expect(unidadesBuscadasDesde(null)).toBeNull()
  })
})
