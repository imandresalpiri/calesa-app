import { describe, expect, it } from 'vitest'
import { delOrigen, porTitulo, vehiculosDelGrupoDesde } from './unidades-del-grupo'

const O1 = '11111111-1111-4111-8111-111111111111'
const O2 = '22222222-2222-4222-8222-222222222222'
const V = (n: number) => `00000000-0000-4000-8000-00000000000${String(n)}`

const unidad = (vehiculo: string | null, titulo: string | null, origen: string | null) => ({
  transporte_id: '99999999-9999-4999-8999-999999999999',
  vehiculo_id: vehiculo,
  repuesto_id: vehiculo === null ? '88888888-8888-4888-8888-888888888888' : null,
  titulo,
  origen_id: origen,
  fase_id: null,
  fase: null,
  fase_orden: null,
  embarque_id: null,
  contenedor_id: null,
})

describe('vehiculosDelGrupoDesde', () => {
  it('sólo los vehículos, una vez cada uno, con «Sin título» si falta', () => {
    const leido = vehiculosDelGrupoDesde({
      tipo: 'booking',
      clave: 'BK',
      unidades: [
        unidad(V(1), 'B', O1),
        unidad(null, 'Ítem', null),
        unidad(V(1), 'B', O1),
        unidad(V(2), null, O2),
      ],
      hay_mas: true,
      hay_ocultas: false,
      embarques: [],
    })
    expect(leido?.hayMas).toBe(true)
    expect(leido?.vehiculos.map((v) => [v.vehiculoId, v.titulo])).toEqual([
      [V(1), 'B'],
      [V(2), 'Sin título'],
    ])
  })

  it('una forma distinta no se lee', () => {
    expect(vehiculosDelGrupoDesde({ unidades: 'no', hay_mas: false })).toBeNull()
    expect(vehiculosDelGrupoDesde(null)).toBeNull()
  })
})

describe('el orden y el origen', () => {
  const leido = vehiculosDelGrupoDesde({
    unidades: [unidad(V(3), 'b', O1), unidad(V(2), 'a', O2), unidad(V(1), 'b', O1)],
    hay_mas: false,
  })
  const vehiculos = leido?.vehiculos ?? []

  it('por título y, en empate, por id', () => {
    expect(porTitulo(vehiculos).map((v) => v.vehiculoId)).toEqual([V(2), V(1), V(3)])
  })

  it('delOrigen deja sólo los de ese origen, ordenados', () => {
    expect(delOrigen(vehiculos, O1).map((v) => v.vehiculoId)).toEqual([V(1), V(3)])
    expect(delOrigen(vehiculos, '33333333-3333-4333-8333-333333333333')).toEqual([])
  })
})
