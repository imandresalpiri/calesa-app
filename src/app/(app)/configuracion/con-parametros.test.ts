import { describe, expect, it } from 'vitest'
import {
  conElPanelDeOrigenes,
  conParametros,
  deLaBusqueda,
  redireccionPermanente,
} from './con-parametros'

describe('conParametros', () => {
  it('quita `seccion` y conserva lo demás, en su orden', () => {
    expect(
      conParametros('/configuracion/x/y', { seccion: 'y', panel: 'nuevo', catalogo: 'tipo' }),
    ).toBe('/configuracion/x/y?panel=nuevo&catalogo=tipo')
  })

  it('sin parámetros que conservar, la ruta sola', () => {
    expect(conParametros('/configuracion/x/y', {})).toBe('/configuracion/x/y')
    expect(conParametros('/configuracion/x/y', { seccion: 'y', otro: undefined })).toBe(
      '/configuracion/x/y',
    )
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

describe('conElPanelDeOrigenes', () => {
  const ORIGENES = '/configuracion/origenes'

  it('sin panel propio, el de la tarjeta y el resto de la consulta', () => {
    expect(conElPanelDeOrigenes(ORIGENES, 'colores', {})).toBe(`${ORIGENES}?panel=colores`)
    expect(conElPanelDeOrigenes(ORIGENES, 'vigencia', { x: '1', seccion: 'ajustes' })).toBe(
      `${ORIGENES}?panel=vigencia&x=1`,
    )
  })

  it('el panel propio manda, y es uno solo', () => {
    expect(
      conElPanelDeOrigenes(ORIGENES, 'colores', { panel: 'editar-tono', tono: 'abc', x: '1' }),
    ).toBe(`${ORIGENES}?panel=editar-tono&tono=abc&x=1`)
    expect(conElPanelDeOrigenes(ORIGENES, 'colores', { panel: ['eliminar-tono', 'otro'] })).toBe(
      `${ORIGENES}?panel=eliminar-tono`,
    )
  })

  it('un panel vacío cuenta como ninguno', () => {
    expect(conElPanelDeOrigenes(ORIGENES, 'colores', { panel: '' })).toBe(
      `${ORIGENES}?panel=colores`,
    )
  })
})
