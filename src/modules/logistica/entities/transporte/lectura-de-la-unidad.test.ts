import { describe, expect, it } from 'vitest'
import { lecturaDelTransporteDesde, versionesDeLasEntidades } from './lectura-de-la-unidad'

const ID = '11111111-1111-4111-8111-111111111111'
const EMBARQUE = '22222222-2222-4222-8222-222222222222'
const CONTENEDOR = '33333333-3333-4333-8333-333333333333'

const fila = {
  id: ID,
  naviera_id: null,
  puerto_origen_id: null,
  puerto_destino_id: null,
  contenedor: 'MSCU1234567',
  booking: 'BK-1',
  zarpe_el: '2026-11-01',
  eta_el: '2026-12-01',
  arribo_el: null,
  notas: null,
  actualizado_en: '2026-11-26T10:00:00+00:00',
}

const embarque = {
  id: EMBARQUE,
  booking: 'BK-1',
  actualizado_en: '2026-11-25T10:00:00+00:00',
  estado: 'en_transito',
  vehiculos: { n: 100, hay_mas: true, hay_ocultas: false },
}
const contenedor = {
  id: CONTENEDOR,
  numero: 'MSCU1234567',
  actualizado_en: '2026-11-24T10:00:00+00:00',
  estado: 'en_transito',
  vehiculos: { n: 3, hay_mas: false, hay_ocultas: true },
}

describe('lecturaDelTransporteDesde', () => {
  it('nulo es una unidad sin transporte', () => {
    expect(lecturaDelTransporteDesde(null)).toBeNull()
  })

  it('la fila con su embarque y su contenedor', () => {
    const lectura = lecturaDelTransporteDesde({
      ...fila,
      entidades: {
        embarque,
        contenedor: { ...contenedor, tipo: null, sello: null },
      },
    })
    expect(lectura?.transporte.booking).toBe('BK-1')
    expect(lectura?.embarque).toEqual({
      id: EMBARQUE,
      booking: 'BK-1',
      actualizadoEn: '2026-11-25T10:00:00+00:00',
      estado: 'en_transito',
      vehiculos: { n: 100, hayMas: true, hayOcultas: false },
    })
    expect(lectura?.contenedorDeLaUnidad?.vehiculos).toEqual({
      n: 3,
      hayMas: false,
      hayOcultas: true,
    })
    expect(versionesDeLasEntidades(lectura ?? null)).toEqual({
      embarqueEsperado: '2026-11-25T10:00:00+00:00',
      contenedorEsperado: '2026-11-24T10:00:00+00:00',
    })
  })

  it('suelta: sin entidades y sin versiones que mandar', () => {
    const lectura = lecturaDelTransporteDesde({
      ...fila,
      entidades: { embarque: null, contenedor: null },
    })
    expect(lectura?.embarque).toBeNull()
    expect(lectura?.contenedorDeLaUnidad).toBeNull()
    expect(versionesDeLasEntidades(lectura ?? null)).toEqual({
      embarqueEsperado: null,
      contenedorEsperado: null,
    })
  })

  it('un contenedor sin embarque está «sin embarque»', () => {
    const lectura = lecturaDelTransporteDesde({
      ...fila,
      entidades: {
        embarque: null,
        contenedor: { ...contenedor, estado: 'sin_embarque' },
      },
    })
    expect(lectura?.contenedorDeLaUnidad?.estado).toBe('sin_embarque')
  })

  it('sin `entidades`, con un estado que no existe o con la fila rota, no se lee', () => {
    expect(lecturaDelTransporteDesde(fila)).toBeUndefined()
    expect(
      lecturaDelTransporteDesde({
        ...fila,
        entidades: {
          embarque: { ...embarque, estado: 'sin_embarque' },
          contenedor: null,
        },
      }),
    ).toBeUndefined()
    expect(
      lecturaDelTransporteDesde({
        ...fila,
        id: 'no',
        entidades: { embarque: null, contenedor: null },
      }),
    ).toBeUndefined()
  })
})
