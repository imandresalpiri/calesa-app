import { describe, expect, it } from 'vitest'
import { hayTotalEnLaHoja, hojaDesde } from './hoja'
import { crudaDeLaHoja } from './hoja-de-prueba.soporte'

describe('hojaDesde: la tarjeta del total como pieza', () => {
  it('lee el ítem total con su aspecto y la hoja sabe que el total va en una sección', () => {
    const cruda = crudaDeLaHoja()
    const [seccion] = cruda.secciones
    if (!seccion) throw new Error('sin sección')
    const total = {
      tipo: 'total',
      nodo: 'total',
      etiqueta: 'Total',
      formato: 'usd',
      ancho: 6,
      alto: 2,
    }
    const leida = hojaDesde({
      ...cruda,
      secciones: [{ ...seccion, items: [...seccion.items, total] }],
    })
    if (leida?.estado !== 'lista') throw new Error('no se leyó')
    expect(leida.secciones[0]?.items.at(-1)).toEqual({
      tipo: 'total',
      nodo: 'total',
      etiqueta: 'Total',
      formato: 'usd',
      ancho: 6,
      alto: 2,
    })
    expect(hayTotalEnLaHoja(leida)).toBe(true)
    const vieja = hojaDesde(crudaDeLaHoja())
    if (vieja?.estado !== 'lista') throw new Error('no se leyó')
    expect(hayTotalEnLaHoja(vieja)).toBe(false)
  })
})
