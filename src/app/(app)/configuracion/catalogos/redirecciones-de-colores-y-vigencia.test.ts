import { NextRequest } from 'next/server'
import { describe, expect, it } from 'vitest'
import configuracion from '../../../../../next.config'
import { GET as colores } from './colores/route'
import { GET as vigencia } from './vigencia/route'

const pedir = (manejador: typeof colores, ruta: string) =>
  manejador(new NextRequest(`http://localhost${ruta}`))

describe('/configuracion/catalogos/colores y /vigencia', () => {
  it('Colores: 308 al modal de su tarjeta en Orígenes', () => {
    const respuesta = pedir(colores, '/configuracion/catalogos/colores')
    expect(respuesta.status).toBe(308)
    expect(respuesta.headers.get('Location')).toBe('/configuracion/origenes?panel=colores')
  })

  it('Vigencia: 308 al modal de su tarjeta en Orígenes', () => {
    const respuesta = pedir(vigencia, '/configuracion/catalogos/vigencia')
    expect(respuesta.status).toBe(308)
    expect(respuesta.headers.get('Location')).toBe('/configuracion/origenes?panel=vigencia')
  })

  it('el panel propio de la URL vieja manda y viaja el resto de la consulta', () => {
    expect(
      pedir(colores, '/configuracion/catalogos/colores?panel=editar-tono&tono=abc').headers.get(
        'Location',
      ),
    ).toBe('/configuracion/origenes?panel=editar-tono&tono=abc')
    expect(
      pedir(
        colores,
        '/configuracion/catalogos/colores?panel=eliminar-tono&tono=abc&x=1',
      ).headers.get('Location'),
    ).toBe('/configuracion/origenes?panel=eliminar-tono&tono=abc&x=1')
    expect(
      pedir(colores, '/configuracion/catalogos/colores?panel=nuevo-tono').headers.get('Location'),
    ).toBe('/configuracion/origenes?panel=nuevo-tono')
    expect(pedir(vigencia, '/configuracion/catalogos/vigencia?x=1').headers.get('Location')).toBe(
      '/configuracion/origenes?panel=vigencia&x=1',
    )
  })
})

describe('/configuracion/cotizacion/general en next.config', () => {
  const reglas = async () => (await configuracion('phase-development-server').redirects?.()) ?? []

  it('va a Orígenes en un solo salto: con su `?panel=` propio, sin el de la tarjeta (uno solo manda)', async () => {
    const delGeneral = (await reglas()).filter((r) =>
      r.source.startsWith('/configuracion/cotizacion/general'),
    )
    const resumen = delGeneral.map((r) => ({
      source: r.source,
      destination: r.destination,
      conPanel: r.has?.some((c) => c.type === 'query' && c.key === 'panel') ?? false,
      sinPanel: r.missing?.some((c) => c.type === 'query' && c.key === 'panel') ?? false,
      permanent: r.permanent,
    }))
    expect(resumen).toEqual([
      {
        source: '/configuracion/cotizacion/general',
        destination: '/configuracion/origenes',
        conPanel: true,
        sinPanel: false,
        permanent: true,
      },
      {
        source: '/configuracion/cotizacion/general',
        destination: '/configuracion/origenes?panel=colores',
        conPanel: false,
        sinPanel: true,
        permanent: true,
      },
      {
        source: '/configuracion/cotizacion/general/:parte(colores|vigencia)',
        destination: '/configuracion/origenes',
        conPanel: true,
        sinPanel: false,
        permanent: true,
      },
      {
        source: '/configuracion/cotizacion/general/:parte(colores|vigencia)',
        destination: '/configuracion/origenes?panel=:parte',
        conPanel: false,
        sinPanel: true,
        permanent: true,
      },
      {
        source: '/configuracion/cotizacion/general/niveles',
        destination: '/configuracion/roles?bloque=cotizaciones',
        conPanel: false,
        sinPanel: false,
        permanent: true,
      },
    ])
  })
})
