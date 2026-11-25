import { describe, expect, it } from 'vitest'
import { destinoAlEntrar } from './pestana-de-entrada'

const O = '11111111-1111-4111-8111-111111111111'
const BASE = `/configuracion/origenes/${O}`
const TODAS = ['fases', 'planilla', 'hoja', 'tarjeta', 'campos', 'categorias'] as const

const entrar = (
  parametros: Record<string, string | string[]>,
  {
    recordada = null,
    abiertas = TODAS,
  }: {
    recordada?: (typeof TODAS)[number] | null
    abiertas?: readonly (typeof TODAS)[number][]
  } = {},
) => destinoAlEntrar({ id: O, parametros, recordada, abiertas })

describe('destinoAlEntrar', () => {
  it('la recordada si la abre; si no, la primera que abre; si no abre ninguna, Fases', () => {
    expect(entrar({})).toBe(`${BASE}/fases`)
    expect(entrar({}, { recordada: 'hoja' })).toBe(`${BASE}/hoja`)
    expect(
      entrar(
        {},
        { recordada: 'fases', abiertas: ['planilla', 'hoja', 'tarjeta', 'campos', 'categorias'] },
      ),
    ).toBe(`${BASE}/planilla`)
    expect(entrar({}, { abiertas: [] })).toBe(`${BASE}/fases`)
  })

  it('conserva la consulta entera, también una clave que ya no se usa', () => {
    expect(entrar({ panel: 'datos', fase: 'f1' }, { recordada: 'campos' })).toBe(
      `${BASE}/campos?panel=datos&fase=f1`,
    )
    expect(entrar({ seccion: 'flujo' })).toBe(`${BASE}/fases?seccion=flujo`)
  })
})
