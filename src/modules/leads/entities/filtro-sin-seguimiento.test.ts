import { describe, expect, it } from 'vitest'
import { leerFiltros } from '@/shared/lib/filtros'
import type { CampoDeLead } from './campo'
import { condicionesDeLeads, esquemaDeFiltrosDeLeads } from './filtros'

const CAMPOS: CampoDeLead[] = []
const esquema = (verTodos = false) =>
  esquemaDeFiltrosDeLeads({
    campos: CAMPOS,
    origenes: [{ id: 'o1', clave: 'web', nombre: 'Web' }],
    tipos: [],
    verTodos,
    etiquetas: [],
  })

describe('condicionesDeLeads: «Sin seguimiento»', () => {
  const AHORA = '2026-11-21T12:00:00.000Z'
  const leer = (url: string) =>
    leerFiltros(esquema(true), Object.fromEntries(new URLSearchParams(url)))

  it('sin la clave en la URL no suma nada', () => {
    const condiciones = condicionesDeLeads(CAMPOS, leer(''), { soloMios: false, ahora: AHORA })
    expect(condiciones.some((c) => c.tipo === 'sin_seguimiento')).toBe(false)
  })

  it('`?sin_seguimiento=si` pide los de más de 24 h antes de ahora, como el bloque de Inicio', () => {
    const condiciones = condicionesDeLeads(CAMPOS, leer('sin_seguimiento=si'), {
      soloMios: true,
      ahora: AHORA,
    })
    expect(condiciones).toContainEqual({
      tipo: 'sin_seguimiento',
      valor: true,
      creadosAntesDe: '2026-11-20T12:00:00.000Z',
    })
    expect(condiciones).toContainEqual({ tipo: 'en_cartera', desdeLaCartera: false })
  })

  it('`?sin_seguimiento=no` es lo contrario y otro valor se ignora', () => {
    expect(
      condicionesDeLeads(CAMPOS, leer('sin_seguimiento=no'), { soloMios: false, ahora: AHORA }),
    ).toContainEqual({
      tipo: 'sin_seguimiento',
      valor: false,
      creadosAntesDe: '2026-11-20T12:00:00.000Z',
    })
    expect(
      condicionesDeLeads(CAMPOS, leer('sin_seguimiento=quizas'), { soloMios: false, ahora: AHORA }),
    ).toEqual([{ tipo: 'tachado', valor: false }])
  })

  it('combina con tipo y origen sin pisarlos', () => {
    const condiciones = condicionesDeLeads(CAMPOS, leer('sin_seguimiento=si&origen=o1'), {
      soloMios: false,
      ahora: AHORA,
    })
    expect(condiciones.map((c) => c.tipo)).toEqual(
      expect.arrayContaining(['columna_en', 'sin_seguimiento', 'tachado']),
    )
  })
})
