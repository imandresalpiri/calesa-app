import { describe, expect, it } from 'vitest'
import { agruparCampos } from './agrupar'

function campo(clave: string, grupo: string | null, ordenDelGrupo: number | null, activo = true) {
  return { clave, grupo, ordenDelGrupo, activo }
}

describe('agruparCampos', () => {
  it('ordena los grupos por el catálogo, no por el primer campo, y deja «sin grupo» al final', () => {
    const grupos = agruparCampos([
      campo('c1', null, null),
      campo('c2', 'Subasta', 20),
      campo('c3', 'Vehículo', 10),
      campo('c4', 'Subasta', 20),
    ])
    expect(grupos.map((g) => g.nombre)).toEqual(['Vehículo', 'Subasta', null])
    expect(grupos[1]?.campos.map((c) => c.clave)).toEqual(['c2', 'c4'])
  })

  it('con el mismo orden, por nombre', () => {
    const grupos = agruparCampos([campo('c1', 'Venta', 10), campo('c2', 'Aspecto', 10)])
    expect(grupos.map((g) => g.nombre)).toEqual(['Aspecto', 'Venta'])
  })

  it('no muestra los desactivados', () => {
    const grupos = agruparCampos([campo('c1', 'Vehículo', 10), campo('c2', 'Vehículo', 10, false)])
    expect(grupos.flatMap((g) => g.campos)).toHaveLength(1)
  })

  it('sin campos activos no hay grupos', () => {
    expect(agruparCampos([campo('c1', 'Venta', 10, false)])).toEqual([])
  })
})
