import { describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import { origenesDeArtes } from './origenes'

const AUTOS = { id: '11111111-1111-4111-8111-111111111111', nombre: 'Autos', activo: true }
const MOTOS = { id: '22222222-2222-4222-8222-222222222222', nombre: 'Motos', activo: false }
const BARCOS = { id: '33333333-3333-4333-8333-333333333333', nombre: 'Barcos', activo: true }

describe('origenesDeArtes', () => {
  it('deja los orígenes donde ve cotizaciones, activos o no', () => {
    const permisos: Permisos = [
      { clave: 'cotizaciones.ver', origenId: AUTOS.id, alcance: 'todos' },
      { clave: 'cotizaciones.ver', origenId: MOTOS.id, alcance: 'todos' },
    ]
    expect(origenesDeArtes(permisos, [AUTOS, MOTOS, BARCOS])).toEqual([AUTOS, MOTOS])
  })

  it('con el permiso para todos, todos', () => {
    const permisos: Permisos = [{ clave: 'cotizaciones.ver', origenId: null, alcance: 'todos' }]
    expect(origenesDeArtes(permisos, [AUTOS, MOTOS, BARCOS])).toHaveLength(3)
  })

  it('sin ver cotizaciones, ninguno (aunque gestione las artes de la empresa)', () => {
    const permisos: Permisos = [
      { clave: 'artes.empresa.gestionar', origenId: null, alcance: 'todos' },
    ]
    expect(origenesDeArtes(permisos, [AUTOS, BARCOS])).toEqual([])
  })
})
