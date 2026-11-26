import { describe, expect, it } from 'vitest'
import { COLUMNAS_EDITABLES } from './celda'
import { GRUPOS_DEL_ITEM, grupoDe, gruposQueSeEditan, tarjetasDelItem } from './grupos-del-item'

describe('grupos del ítem', () => {
  it('cada columna editable está en un grupo, y en uno solo', () => {
    const columnas: string[] = GRUPOS_DEL_ITEM.flatMap((g) => [...g.columnas])
    expect([...columnas].sort()).toEqual([...COLUMNAS_EDITABLES].sort())
  })

  it('grupoDe sólo conoce las claves de los grupos', () => {
    expect(grupoDe('cantidades')?.titulo).toBe('Cantidades y precios')
    expect(grupoDe('panel')).toBeNull()
    expect(grupoDe(null)).toBeNull()
  })
})

describe('grupos que se editan', () => {
  it('con permiso y el proyecto abierto se editan todos', () => {
    expect(gruposQueSeEditan(true)).toEqual(['que-es', 'cantidades', 'origen', 'notas'])
  })

  it('sin permiso o con el proyecto cerrado no se edita ninguno: se leen como texto', () => {
    expect(gruposQueSeEditan(false)).toEqual([])
  })
})

describe('tarjetas del ítem', () => {
  it('con costos y proyecto están todas, en el orden de uso', () => {
    expect(tarjetasDelItem({ costosVer: true, conProyecto: true })).toEqual([
      'imagenes',
      'stock',
      'compras',
      'documentos',
      'historial',
      'notas',
      'proyecto',
    ])
  })

  it('sin repuestos.costos.ver no hay tarjeta de compras', () => {
    expect(tarjetasDelItem({ costosVer: false, conProyecto: true })).not.toContain('compras')
  })

  it('en la Cadena no hay tarjeta del proyecto', () => {
    expect(tarjetasDelItem({ costosVer: true, conProyecto: false })).not.toContain('proyecto')
  })
})
