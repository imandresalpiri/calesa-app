import { describe, expect, it } from 'vitest'
import { textoDelResto, usosDelMes } from './usos'

const persona = (i: number) => ({
  usuario_id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
  nombre: `Persona ${i}`,
  usos: 10 - i,
})
const leido = (personas: number, cuantas: number) => ({
  mes: '2026-11-01',
  personas: Array.from({ length: Math.min(personas, 6) }, (_, i) => persona(i)),
  cuantas,
})

describe('usosDelMes', () => {
  it('sin usos no hay filas ni resto', () => {
    expect(usosDelMes(leido(0, 0))).toEqual({
      ok: true,
      data: { mes: '2026-11-01', personas: [], resto: null },
    })
  })

  it('hasta 5 personas, todas a la vista', () => {
    const usos = usosDelMes(leido(5, 5))
    expect(usos.ok && usos.data.personas.map((p) => p.nombre)).toHaveLength(5)
    expect(usos.ok && usos.data.resto).toBeNull()
    expect(usos.ok && usos.data.personas[0]).toEqual({
      usuarioId: '00000000-0000-4000-8000-000000000000',
      nombre: 'Persona 0',
      usos: 10,
    })
  })

  it('con 6, se ven 5 y queda una más', () => {
    const usos = usosDelMes(leido(6, 6))
    expect(usos.ok && usos.data.personas).toHaveLength(5)
    expect(usos.ok && usos.data.resto).toEqual({ n: 1, hayMas: false })
  })

  it('pasado el tope de la base, el resto no es exacto', () => {
    const usos = usosDelMes(leido(6, 101))
    expect(usos.ok && usos.data.resto).toEqual({ n: 95, hayMas: true })
    expect(usosDelMes(leido(6, 100))).toMatchObject({ data: { resto: { n: 95, hayMas: false } } })
  })

  it('una respuesta con otra forma es un error', () => {
    expect(usosDelMes({ mes: '2026-11-01' })).toMatchObject({ ok: false })
  })
})

it('el resto en palabras', () => {
  expect(textoDelResto({ n: 3, hayMas: false }, 'es-BO')).toBe('y 3 más')
  expect(textoDelResto({ n: 95, hayMas: true }, 'es-BO')).toBe('y 95+ más')
})
