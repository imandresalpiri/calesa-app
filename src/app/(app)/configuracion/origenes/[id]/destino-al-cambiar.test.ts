import { describe, expect, it } from 'vitest'
import { destinoAlCambiarDeOrigen, filtrarOrigenes } from './destino-al-cambiar'

const parte = (id: string, p: string) => `/o/${id}/${p}`
const entrada = (id: string) => `/o/${id}`

describe('destinoAlCambiarDeOrigen', () => {
  it('conserva la pestaña si se abre en el otro origen', () => {
    const otro = { id: 'b', nombre: 'B', abiertas: ['fases', 'planilla', 'campos'] as const }
    expect(destinoAlCambiarDeOrigen(otro, 'planilla', parte, entrada)).toBe('/o/b/planilla')
  })

  it('si no la abre, la primera que abre; sin ninguna, la entrada', () => {
    const soloCampos = { id: 'c', nombre: 'C', abiertas: ['campos', 'categorias'] as const }
    expect(destinoAlCambiarDeOrigen(soloCampos, 'planilla', parte, entrada)).toBe('/o/c/campos')
    expect(
      destinoAlCambiarDeOrigen({ id: 'd', nombre: 'D', abiertas: [] }, 'fases', parte, entrada),
    ).toBe('/o/d')
  })
})

describe('filtrarOrigenes', () => {
  const origenes = [
    { id: '1', nombre: 'Japón', abiertas: [] },
    { id: '2', nombre: 'Corea', abiertas: [] },
  ]
  it('busca sin tildes ni mayúsculas; vacío devuelve todos', () => {
    expect(filtrarOrigenes(origenes, 'JAPON').map((o) => o.id)).toEqual(['1'])
    expect(filtrarOrigenes(origenes, '  ')).toHaveLength(2)
    expect(filtrarOrigenes(origenes, 'chile')).toEqual([])
  })
})
