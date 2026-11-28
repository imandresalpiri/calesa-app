import { describe, expect, it } from 'vitest'
import { leerFiltros } from '@/shared/lib/filtros'
import {
  claveDelPedido,
  esquemaDeFiltrosDeArtes,
  hayFiltrosDePlantillas,
  leerPestana,
  pedidoDePlantillas,
} from './filtros'

const ORIGEN = '00000000-0000-0000-0000-0000000000a1'
const esquema = esquemaDeFiltrosDeArtes([{ id: ORIGEN, nombre: 'Corea', activo: true }])

describe('filtros de las plantillas de arte', () => {
  it('sin filtros, todas', () => {
    const pedido = pedidoDePlantillas(leerFiltros(esquema, {}))
    expect(pedido).toEqual({ origenId: null, formato: null, de: null })
    expect(hayFiltrosDePlantillas(pedido)).toBe(false)
  })

  it('lee origen, formato y de quién', () => {
    const pedido = pedidoDePlantillas(
      leerFiltros(esquema, { origen: ORIGEN, formato: 'vertical', de: 'mias' }),
    )
    expect(pedido).toEqual({ origenId: ORIGEN, formato: 'vertical', de: 'mias' })
    expect(hayFiltrosDePlantillas(pedido)).toBe(true)
    expect(claveDelPedido(pedido)).toBe(`${ORIGEN}|vertical|mias`)
  })

  it('lo inválido se descarta', () => {
    const pedido = pedidoDePlantillas(
      leerFiltros(esquema, {
        origen: '00000000-0000-0000-0000-0000000000ff',
        formato: 'oficio',
        de: 'otras',
      }),
    )
    expect(pedido).toEqual({ origenId: null, formato: null, de: null })
  })

  it('la pestaña', () => {
    expect(leerPestana({})).toBe('plantillas')
    expect(leerPestana({ pestana: 'imagenes' })).toBe('imagenes')
    expect(leerPestana({ pestana: 'otra' })).toBe('plantillas')
  })
})
