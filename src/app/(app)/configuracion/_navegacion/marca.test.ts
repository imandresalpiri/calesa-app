import { describe, expect, it } from 'vitest'
import { marcaDe, marcaDelEnlace } from './marca'

describe('marcaDelEnlace', () => {
  it('la ruta exacta es la página', () => {
    expect(marcaDelEnlace('/configuracion/leads', '/configuracion/leads')).toBe('page')
  })

  it('una ruta de más abajo que no es sub-sección marca su sección: el detalle de un origen', () => {
    const id = '00000000-0000-4000-8000-000000000001'
    expect(marcaDelEnlace(`/configuracion/origenes/${id}`, '/configuracion/origenes')).toBe('page')
  })

  it('en una sub-sección, la sección es la rama y la sub-sección la página', () => {
    const subrutas = ['/configuracion/leads/campos', '/configuracion/leads/otra']
    expect(marcaDelEnlace('/configuracion/leads/campos', '/configuracion/leads', subrutas)).toBe(
      'true',
    )
    expect(marcaDelEnlace('/configuracion/leads/campos', '/configuracion/leads/campos')).toBe(
      'page',
    )
    expect(
      marcaDelEnlace('/configuracion/leads/campos', '/configuracion/leads/otra'),
    ).toBeUndefined()
  })

  it('otra sección, un prefijo sin barra o el inicio no marcan', () => {
    expect(marcaDelEnlace('/configuracion/origenes', '/configuracion/leads')).toBeUndefined()
    expect(marcaDelEnlace('/configuracion/web-cola', '/configuracion/web')).toBeUndefined()
    expect(marcaDelEnlace('/configuracion', '/configuracion/empresa')).toBeUndefined()
  })

  it('la sub-sección índice se marca sólo en su ruta exacta; la sección queda como rama', () => {
    const subrutas = ['/configuracion/empresa', '/configuracion/empresa/monedas']
    expect(marcaDelEnlace('/configuracion/empresa', '/configuracion/empresa', [], true)).toBe(
      'page',
    )
    expect(
      marcaDelEnlace('/configuracion/empresa/monedas', '/configuracion/empresa', [], true),
    ).toBeUndefined()
    expect(marcaDelEnlace('/configuracion/empresa', '/configuracion/empresa', subrutas)).toBe(
      'true',
    )
    expect(
      marcaDelEnlace('/configuracion/empresa/monedas', '/configuracion/empresa', subrutas),
    ).toBe('true')
  })
})

describe('un origen en el menú', () => {
  const id = '00000000-0000-4000-8000-000000000001'
  const otro = '00000000-0000-4000-8000-000000000002'
  const origen = {
    ruta: `/configuracion/origenes/${id}/fases`,
    marca: `/configuracion/origenes/${id}`,
  }
  const subrutas = [marcaDe(origen), `/configuracion/origenes/${otro}`]

  it('se marca en todas sus pestañas', () => {
    for (const pestana of ['fases', 'planilla', 'hoja', 'tarjeta', 'campos', 'categorias']) {
      const actual = `/configuracion/origenes/${id}/${pestana}`
      expect(marcaDelEnlace(actual, marcaDe(origen)), pestana).toBe('page')
      expect(marcaDelEnlace(actual, '/configuracion/origenes', subrutas), pestana).toBe('true')
    }
  })

  it('no se marca en otro origen ni en la lista', () => {
    expect(marcaDelEnlace(`/configuracion/origenes/${otro}/fases`, marcaDe(origen))).toBeUndefined()
    expect(marcaDelEnlace('/configuracion/origenes', marcaDe(origen))).toBeUndefined()
    expect(marcaDelEnlace('/configuracion/origenes', '/configuracion/origenes', subrutas)).toBe(
      'page',
    )
  })

  it('sin marca, se marca por su ruta', () => {
    expect(marcaDe({ ruta: '/configuracion/leads/campos' })).toBe('/configuracion/leads/campos')
  })
})
