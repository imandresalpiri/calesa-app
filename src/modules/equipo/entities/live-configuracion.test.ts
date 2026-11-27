import { describe, expect, it } from 'vitest'
import {
  ajustesDeLosRolesDesde,
  cursorDeLaPagina,
  personasDelLiveDesde,
  sumarPagina,
  textoDeLaBusquedaDelLive,
  type PaginaDePersonasDelLive,
} from './live-configuracion'

const R1 = '00000000-0000-4000-8000-000000000001'
const R2 = '00000000-0000-4000-8000-000000000002'
const R3 = '00000000-0000-4000-8000-000000000003'
const P1 = '00000000-0000-4000-8000-0000000000a1'
const P2 = '00000000-0000-4000-8000-0000000000a2'

describe('ajustesDeLosRolesDesde', () => {
  const roles = [
    { id: R1, nombre: 'Dueño' },
    { id: R2, nombre: 'Ventas' },
    { id: R3, nombre: 'Logística' },
  ]

  it('une cada rol con su fila, en el orden de los roles; sin fila, «Por defecto» (null)', () => {
    const leidos = ajustesDeLosRolesDesde(
      roles,
      [{ rol_id: R2, ajustes: { clientes: 'nombres' }, actualizado_en: '2026-11-27T10:00:00Z' }],
      100,
    )
    expect(leidos.hayMas).toBe(false)
    expect(leidos.roles).toEqual([
      { rol: { id: R1, nombre: 'Dueño' }, ajustes: null, actualizadoEn: null },
      {
        rol: { id: R2, nombre: 'Ventas' },
        ajustes: { clientes: 'nombres' },
        actualizadoEn: '2026-11-27T10:00:00Z',
      },
      { rol: { id: R3, nombre: 'Logística' }, ajustes: null, actualizadoEn: null },
    ])
  })

  it('corta en el tope y dice que había más', () => {
    const leidos = ajustesDeLosRolesDesde(roles, [], 2)
    expect(leidos.roles.map((r) => r.rol.id)).toEqual([R1, R2])
    expect(leidos.hayMas).toBe(true)
  })

  it('una fila con otra forma es un error (la base ya la valida al escribir)', () => {
    expect(() =>
      ajustesDeLosRolesDesde(
        roles,
        [{ rol_id: R1, ajustes: { otra: 1 }, actualizado_en: 'x' }],
        100,
      ),
    ).toThrow()
  })
})

const json = {
  personas: [
    {
      id: P1,
      nombre: 'Ana',
      email: 'ana@ejemplo.com',
      rol: { id: R2, nombre: 'Ventas', ajustes: { inicio: true } },
      ajustes: { clientes: 'completo', origenes_config: 'lectura' },
      actualizado_en: '2026-11-27T10:00:00Z',
    },
    {
      id: P2,
      nombre: 'Beto',
      email: 'beto@ejemplo.com',
      rol: null,
      ajustes: null,
      actualizado_en: null,
    },
  ],
  hay_mas: true,
}

describe('personasDelLiveDesde', () => {
  it('lee las personas con su rol (y sus ajustes) y lo propio, en camelCase', () => {
    const pagina = personasDelLiveDesde(json)
    expect(pagina.hayMas).toBe(true)
    expect(pagina.personas[0]).toEqual({
      id: P1,
      nombre: 'Ana',
      email: 'ana@ejemplo.com',
      rol: { id: R2, nombre: 'Ventas', ajustes: { inicio: true } },
      ajustes: { clientes: 'completo', origenesConfig: 'lectura' },
      actualizadoEn: '2026-11-27T10:00:00Z',
    })
    expect(pagina.personas[1]).toMatchObject({ rol: null, ajustes: null, actualizadoEn: null })
  })

  it('una página con otra forma es un error', () => {
    expect(() => personasDelLiveDesde({ personas: [{ id: 'x' }], hay_mas: false })).toThrow()
  })
})

describe('cursorDeLaPagina', () => {
  const conAjuste = (id: string, en: string) => ({
    id,
    nombre: id,
    email: '',
    rol: null,
    ajustes: { inicio: true },
    actualizadoEn: en,
  })

  it('es la última de la página si hay más', () => {
    const pagina: PaginaDePersonasDelLive = {
      personas: [conAjuste(P1, '2026-11-27T10:00:00Z'), conAjuste(P2, '2026-11-27T09:00:00Z')],
      hayMas: true,
    }
    expect(cursorDeLaPagina(pagina)).toEqual({ en: '2026-11-27T09:00:00Z', id: P2 })
  })

  it('sin más, o con una última sin lo propio (una búsqueda), no hay cursor', () => {
    expect(cursorDeLaPagina({ personas: [conAjuste(P1, 'x')], hayMas: false })).toBeNull()
    expect(cursorDeLaPagina(personasDelLiveDesde(json))).toBeNull()
  })
})

describe('sumarPagina', () => {
  it('suma sin repetir a quien ya estaba y toma el «hay más» de la nueva', () => {
    const [ana, beto] = personasDelLiveDesde(json).personas
    if (!ana || !beto) throw new Error('faltan personas')
    const suma = sumarPagina(
      { personas: [ana], hayMas: true },
      { personas: [ana, beto], hayMas: false },
    )
    expect(suma.personas.map((p) => p.id)).toEqual([P1, P2])
    expect(suma.hayMas).toBe(false)
  })
})

describe('textoDeLaBusquedaDelLive', () => {
  it('desde 3 letras busca, recortado; con menos o sin texto, nada', () => {
    expect(textoDeLaBusquedaDelLive('  ana  ')).toBe('ana')
    expect(textoDeLaBusquedaDelLive('an')).toBeNull()
    expect(textoDeLaBusquedaDelLive(undefined)).toBeNull()
    expect(textoDeLaBusquedaDelLive('a'.repeat(150))).toHaveLength(100)
  })
})
