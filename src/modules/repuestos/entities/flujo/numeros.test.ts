import { describe, expect, it } from 'vitest'
import type { FaseDeLaCadena } from './cadena-filas'
import { conteosDesde, numerosDe, type ConteosDeLaFase } from './numeros'

const P1 = '00000000-0000-4000-8000-000000000001'
const P2 = '00000000-0000-4000-8000-000000000002'
const P3 = '00000000-0000-4000-8000-000000000003'
const fila = (proyecto: string) => ({ proyecto_id: proyecto, proyecto: { id: proyecto } })

describe('conteosDesde', () => {
  it('cuenta los ítems y sus proyectos distintos', () => {
    expect(conteosDesde([fila(P1), fila(P1), fila(P2)], 5)).toEqual({
      ok: true,
      data: { items: { n: 3, hayMas: false }, proyectos: { n: 2, hayMas: false } },
    })
  })

  it('con más ítems que el tope, los dos llevan «+» y los proyectos salen sólo de los del tope', () => {
    expect(conteosDesde([fila(P1), fila(P2), fila(P3)], 2)).toEqual({
      ok: true,
      data: { items: { n: 2, hayMas: true }, proyectos: { n: 2, hayMas: true } },
    })
  })

  it('una fila que no cumple la forma es un error visible', () => {
    expect(conteosDesde([{ proyecto_id: 'x' }], 5).ok).toBe(false)
    expect(conteosDesde(null, 5).ok).toBe(false)
  })
})

const fase = (id: string, activa = true): FaseDeLaCadena => ({
  id,
  nombre: `Fase ${id}`,
  color: '#123456',
  activa,
  esFinal: false,
})
const conteo = (n: number): ConteosDeLaFase => ({
  items: { n, hayMas: false },
  proyectos: { n: Math.min(n, 1), hayMas: false },
})

describe('numerosDe', () => {
  it('«Sin fase» primera sólo con ítems; las fases en su orden, también vacías', () => {
    const fases = [fase('a'), fase('b')]
    const porFase = new Map([['a', conteo(2)]])
    expect(numerosDe(fases, { sinFase: conteo(0), porFase }).map((n) => n.faseId)).toEqual([
      'a',
      'b',
    ])
    expect(numerosDe(fases, { sinFase: conteo(1), porFase }).map((n) => n.faseId)).toEqual([
      null,
      'a',
      'b',
    ])
    expect(numerosDe(fases, { sinFase: conteo(0), porFase })[1]).toMatchObject({
      nombre: 'Fase b',
      items: { n: 0 },
    })
  })

  it('se saltea una fase jubilada sin ítems; con ítems, se muestra', () => {
    const fases = [fase('a', false), fase('b', false)]
    const porFase = new Map([['b', conteo(3)]])
    expect(numerosDe(fases, { sinFase: conteo(0), porFase }).map((n) => n.faseId)).toEqual(['b'])
  })
})
