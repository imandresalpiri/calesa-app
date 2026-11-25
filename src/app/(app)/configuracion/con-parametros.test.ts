import { describe, expect, it } from 'vitest'
import { conParametros, deLaBusqueda, redireccionPermanente } from './con-parametros'

describe('conParametros', () => {
  it('conserva todo, en su orden, salvo lo que se pide quitar', () => {
    expect(
      conParametros('/configuracion/x/y', { seccion: 'y', panel: 'nuevo', catalogo: 'tipo' }),
    ).toBe('/configuracion/x/y?seccion=y&panel=nuevo&catalogo=tipo')
    expect(conParametros('/configuracion/x/y', { seccion: 'y', panel: 'nuevo' }, ['seccion'])).toBe(
      '/configuracion/x/y?panel=nuevo',
    )
  })

  it('sin parámetros que conservar, la ruta sola; con consulta, se suman a ella', () => {
    expect(conParametros('/configuracion/x/y', {})).toBe('/configuracion/x/y')
    expect(conParametros('/configuracion/x/y', { otro: undefined })).toBe('/configuracion/x/y')
    expect(conParametros('/x?a=1', { b: '2' })).toBe('/x?a=1&b=2')
  })

  it('un parámetro repetido se conserva repetido y se codifica', () => {
    expect(conParametros('/r', { a: ['1', '2'], b: 'á b' })).toBe('/r?a=1&a=2&b=%C3%A1+b')
  })
})

describe('deLaBusqueda', () => {
  it('cada parámetro con su valor; el repetido, en arreglo y en su orden', () => {
    expect(deLaBusqueda(new URLSearchParams('a=1&b=2&a=3&c='))).toEqual({
      a: ['1', '3'],
      b: '2',
      c: '',
    })
  })
})

describe('redireccionPermanente', () => {
  it('es un 308 con la ruta en Location', () => {
    const respuesta = redireccionPermanente('/configuracion/x?y=1')
    expect(respuesta.status).toBe(308)
    expect(respuesta.headers.get('Location')).toBe('/configuracion/x?y=1')
  })

  it('por persona, sin guardarse en el navegador', () => {
    expect(redireccionPermanente('/x').headers.get('Cache-Control')).toBeNull()
    expect(redireccionPermanente('/x', { porPersona: true }).headers.get('Cache-Control')).toBe(
      'private, no-store',
    )
  })
})
