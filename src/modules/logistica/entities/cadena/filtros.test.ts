import { describe, expect, it } from 'vitest'
import { leerFiltros } from '@/shared/lib/filtros'
import {
  avisoDeEntidadQueNoEsta,
  buscaEnTodos,
  cadenaFiltrada,
  entidadPedida,
  esquemaDeFiltrosDeLaCadena,
  pedidoDeLaCadena,
  rutaDeDondeEsta,
} from './filtros'

const NAVIERA = '11111111-1111-4111-8111-111111111111'
const CONTENEDOR = '22222222-2222-4222-8222-222222222222'
const EMBARQUE = '33333333-3333-4333-8333-333333333333'
const esquema = esquemaDeFiltrosDeLaCadena({ navieras: [{ id: NAVIERA, nombre: 'Maersk' }] })
const conContenedor = esquemaDeFiltrosDeLaCadena({
  navieras: [{ id: NAVIERA, nombre: 'Maersk' }],
  entidad: { tipo: 'contenedor', id: CONTENEDOR, nombre: 'MSKU1234567' },
})
const pedido = (url: Record<string, string>) => pedidoDeLaCadena(leerFiltros(esquema, url))

describe('pedidoDeLaCadena', () => {
  it('sin nada en la URL no pide ningún filtro', () => {
    expect(pedido({})).toEqual({})
    expect(cadenaFiltrada(pedido({}))).toBe(false)
  })

  it('«demoradas=si» filtra y la ausencia no deja ni la clave', () => {
    expect(pedido({ demoradas: 'si' })).toEqual({ demoradas: true })
    expect(Object.keys(pedido({ demoradas: 'todas' }))).toEqual([])
    expect(pedido({ por_aprobar: 'si' })).toEqual({ por_aprobar: true })
  })

  it('un valor de elección que no se ofrece se descarta («quizá», «no»)', () => {
    expect(pedido({ demoradas: 'quizá', por_aprobar: 'no' })).toEqual({})
  })

  it('una búsqueda corta no se manda; una que alcanza, sí y recortada', () => {
    expect(pedido({ q: 'ab' })).toEqual({})
    expect(pedido({ q: '  ab  ' })).toEqual({})
    expect(pedido({ q: ' 1HGCM82633A004352 ' })).toEqual({ q: '1HGCM82633A004352' })
  })

  it('el contenedor sólo filtra si el esquema lo nombró, y por su id', () => {
    expect(pedido({ contenedor: CONTENEDOR })).toEqual({})
    const conId = pedidoDeLaCadena(leerFiltros(conContenedor, { contenedor: CONTENEDOR }))
    expect(conId).toEqual({ contenedor: CONTENEDOR })
    expect(cadenaFiltrada(conId)).toBe(true)
    expect(pedidoDeLaCadena(leerFiltros(conContenedor, { contenedor: 'MSKU1234567' }))).toEqual({})
  })

  it('el chip del contenedor dice su número, no el id', () => {
    const filtro = conContenedor.filtros.find((f) => f.clave === 'contenedor')
    expect(filtro?.etiqueta).toBe('Contenedor')
    expect(filtro?.tipo === 'eleccion' ? filtro.opciones.map((o) => o.etiqueta) : []).toContain(
      'MSKU1234567',
    )
    expect(esquema.filtros.some((f) => f.clave === 'contenedor' || f.clave === 'embarque')).toBe(
      false,
    )
  })

  it('«naviera» sólo si es una de las ofrecidas o al menos un guid', () => {
    expect(pedido({ naviera: NAVIERA })).toEqual({ naviera: NAVIERA })
    expect(pedido({ naviera: 'no-es-un-guid' })).toEqual({})
    expect(pedido({ naviera: 'todas' })).toEqual({})
  })

  it('sin navieras, el esquema no ofrece el filtro y la URL no lo produce', () => {
    const sinNavieras = esquemaDeFiltrosDeLaCadena({ navieras: [] })
    expect(sinNavieras.filtros.some((f) => f.clave === 'naviera')).toBe(false)
    expect(pedidoDeLaCadena(leerFiltros(sinNavieras, { naviera: NAVIERA }))).toEqual({})
  })

  it('los filtros ajenos de la URL (origen, fase, vehiculo) no entran al pedido', () => {
    expect(pedido({ origen: NAVIERA, fase: 'sin_fase', vehiculo: NAVIERA })).toEqual({})
  })

  it('lo que sale es lo que la RPC acepta, y nada más', () => {
    const todo = pedidoDeLaCadena(
      leerFiltros(conContenedor, {
        q: 'toyota',
        demoradas: 'si',
        por_aprobar: 'si',
        contenedor: CONTENEDOR,
        naviera: NAVIERA,
      }),
    )
    expect(Object.keys(todo).sort()).toEqual(
      ['contenedor', 'demoradas', 'naviera', 'por_aprobar', 'q'].sort(),
    )
  })
})

describe('el contenedor o el embarque de la URL', () => {
  it('sin ninguno no pide nada; el contenedor manda sobre el embarque', () => {
    expect(entidadPedida({})).toBeNull()
    expect(entidadPedida({ contenedor: '  ' })).toBeNull()
    expect(entidadPedida({ embarque: EMBARQUE })).toEqual({
      tipo: 'embarque',
      id: EMBARQUE,
      valido: true,
    })
    expect(entidadPedida({ contenedor: CONTENEDOR, embarque: EMBARQUE })).toEqual({
      tipo: 'contenedor',
      id: CONTENEDOR,
      valido: true,
    })
  })

  it('una URL vieja con el número o el booking no es un id', () => {
    expect(entidadPedida({ contenedor: 'MSKU1234567' })).toEqual({
      tipo: 'contenedor',
      valido: false,
    })
    expect(entidadPedida({ embarque: ['BK-9'] })).toEqual({ tipo: 'embarque', valido: false })
  })

  it('el aviso nombra la entidad', () => {
    expect(avisoDeEntidadQueNoEsta('contenedor')).toBe('Ese contenedor ya no existe o no lo ves.')
    expect(avisoDeEntidadQueNoEsta('embarque')).toBe('Ese embarque ya no existe o no lo ves.')
  })
})

describe('«Dónde está» en todos los orígenes', () => {
  it('sólo `todos` busca en todos', () => {
    expect(buscaEnTodos('todos')).toBe(true)
    expect(buscaEnTodos(undefined)).toBe(false)
    expect(buscaEnTodos('otro')).toBe(false)
  })

  it('la ruta lleva el origen, lo buscado y, si toca, `en=todos`', () => {
    expect(rutaDeDondeEsta('o1', 'abc 1', false)).toBe('/logistica?origen=o1&q=abc+1')
    expect(rutaDeDondeEsta('o1', 'abc', true)).toBe('/logistica?origen=o1&q=abc&en=todos')
  })
})
