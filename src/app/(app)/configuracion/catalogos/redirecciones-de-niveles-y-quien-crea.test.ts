import { NextRequest } from 'next/server'
import { describe, expect, it } from 'vitest'
import { GET as niveles } from './niveles/route'
import { GET as quienCrea } from './quien-crea-y-quien-ve/route'

const pedir = (manejador: typeof niveles, ruta: string) =>
  manejador(new NextRequest(`http://localhost${ruta}`))

const NIVEL = '3f1c1d52-6a6e-4f0e-9f1b-0a5b6d1c2e77'
const ORIGEN = '9b7c5a2e-1d3f-4e88-8a10-2c4d6e8f0a12'

describe('/configuracion/catalogos/niveles', () => {
  it('308 al bloque «Cotizaciones» de Roles', () => {
    const respuesta = pedir(niveles, '/configuracion/catalogos/niveles')
    expect(respuesta.status).toBe(308)
    expect(respuesta.headers.get('Location')).toBe('/configuracion/roles?bloque=cotizaciones')
  })

  it('viaja el modal de «Nuevo nivel»', () => {
    expect(
      pedir(niveles, '/configuracion/catalogos/niveles?panel=nuevo-nivel').headers.get('Location'),
    ).toBe('/configuracion/roles?bloque=cotizaciones&panel=nuevo-nivel')
  })

  it('viaja el renombre con el id del nivel', () => {
    expect(
      pedir(
        niveles,
        `/configuracion/catalogos/niveles?panel=renombrar-nivel&nivel=${NIVEL}`,
      ).headers.get('Location'),
    ).toBe(`/configuracion/roles?bloque=cotizaciones&panel=renombrar-nivel&nivel=${NIVEL}`)
  })

  it('un `bloque` previo se pisa', () => {
    expect(
      pedir(niveles, '/configuracion/catalogos/niveles?bloque=otro&x=1').headers.get('Location'),
    ).toBe('/configuracion/roles?bloque=cotizaciones&x=1')
  })
})

describe('/configuracion/catalogos/quien-crea-y-quien-ve', () => {
  it('308 al bloque «Cotizaciones» de Roles', () => {
    const respuesta = pedir(quienCrea, '/configuracion/catalogos/quien-crea-y-quien-ve')
    expect(respuesta.status).toBe(308)
    expect(respuesta.headers.get('Location')).toBe('/configuracion/roles?bloque=cotizaciones')
  })

  it('viaja el origen elegido', () => {
    expect(
      pedir(
        quienCrea,
        `/configuracion/catalogos/quien-crea-y-quien-ve?origen=${ORIGEN}`,
      ).headers.get('Location'),
    ).toBe(`/configuracion/roles?bloque=cotizaciones&origen=${ORIGEN}`)
  })
})
