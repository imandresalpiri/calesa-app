import { NextRequest } from 'next/server'
import { describe, expect, it } from 'vitest'
import configuracion from '../../../../../next.config'
import { GET as raizVieja } from '../../configuracion/repuestos/route'

const reglas = async () => (await configuracion('phase-development-server').redirects?.()) ?? []

describe('las redirecciones de la configuración de repuestos en next.config', () => {
  it('las sub-rutas viejas van a su pestaña de Repuestos, en un solo salto y permanentes', async () => {
    const vieja = (await reglas()).find((r) => r.source.startsWith('/configuracion/repuestos/'))
    expect(vieja).toEqual({
      source: '/configuracion/repuestos/:pestana(flujo|cotizador|catalogos)',
      destination: '/repuestos/configuracion/:pestana',
      permanent: true,
    })
  })

  it('la raíz de la configuración abre el flujo', async () => {
    const raiz = (await reglas()).find((r) => r.source === '/repuestos/configuracion')
    expect(raiz).toEqual({
      source: '/repuestos/configuracion',
      destination: '/repuestos/configuracion/flujo',
      permanent: true,
    })
  })
})

describe('/configuracion/repuestos (route.ts)', () => {
  const pedir = (consulta: string) =>
    raizVieja(new NextRequest(`http://localhost/configuracion/repuestos${consulta}`))

  it('responde 308 a la pestaña, con su consulta', () => {
    const sin = pedir('')
    expect(sin.status).toBe(308)
    expect(sin.headers.get('Location')).toBe('/repuestos/configuracion/flujo')
    expect(pedir('?seccion=cotizador').headers.get('Location')).toBe(
      '/repuestos/configuracion/cotizador',
    )
    expect(pedir('?panel=nuevo-valor&catalogo=tipo_pieza').headers.get('Location')).toBe(
      '/repuestos/configuracion/catalogos?panel=nuevo-valor&catalogo=tipo_pieza',
    )
  })
})
