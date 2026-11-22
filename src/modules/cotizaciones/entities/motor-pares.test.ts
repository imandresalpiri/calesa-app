import { describe, expect, it } from 'vitest'
import { paresDeLaHoja, pctsExclusivos } from './motor-pares'
import { type Nodo } from './nodos'
import { nodo } from './nodos.soporte'

const medidor = () => ({ visitas: 0 })
const porIdDe = (nodos: readonly Nodo[]) => new Map(nodos.map((n) => [n.id, n]))
const par = (id: string, pct: string, extra: Record<string, unknown> = {}) =>
  nodo({ id, tipo: 'calculo', op: 'porcentaje_de', de: ['base'], pct, ...extra })

// La hoja de Transferencia: un par con su pct exclusivo, otro cuyo pct también lee un tercero, uno sobrescribible, uno que
// es el total y uno cuyo pct es una tabla.
const NODOS: Nodo[] = [
  nodo({ id: 'base', tipo: 'input' }),
  nodo({ id: 'p_solo', tipo: 'constante' }),
  nodo({ id: 'p_compartido', tipo: 'input' }),
  nodo({ id: 'p_sobre', tipo: 'constante' }),
  nodo({ id: 'p_total', tipo: 'constante' }),
  nodo({ id: 'p_tabla', tipo: 'tabla', tabla: 'x', match: {}, columna: 'v' }),
  par('transferencia', 'p_solo'),
  par('iva', 'p_compartido'),
  nodo({ id: 'otro', tipo: 'calculo', op: 'suma', de: ['p_compartido'] }),
  par('comision', 'p_sobre', { sobrescribible: true }),
  par('total', 'p_total', { salida: 'total', bucket: 'x' }),
  par('flete', 'p_tabla'),
]
const TODOS = new Set(NODOS.map((n) => n.id))

describe('paresDeLaHoja', () => {
  it('sólo el par con celda, no sobrescribible, que no es el total y con su pct exclusivo', () => {
    expect([...paresDeLaHoja(NODOS, porIdDe(NODOS), TODOS, medidor())]).toEqual(['transferencia'])
  })

  it('sin la celda del par, o sin pisables, no hay par por la hoja', () => {
    const sinTransferencia = new Set([...TODOS].filter((id) => id !== 'transferencia'))
    expect(paresDeLaHoja(NODOS, porIdDe(NODOS), sinTransferencia, medidor()).size).toBe(0)
    const m = medidor()
    expect(paresDeLaHoja(NODOS, porIdDe(NODOS), new Set(), m).size).toBe(0)
    expect(m.visitas).toBe(0)
  })
})

describe('pctsExclusivos', () => {
  it('las constantes y los inputs que nombra un solo nodo, con cualquier papel', () => {
    expect([...pctsExclusivos(NODOS, porIdDe(NODOS), medidor())].sort()).toEqual([
      'p_sobre',
      'p_solo',
      'p_total',
    ])
  })

  it('un nodo que nombra dos veces el mismo id cuenta una vez', () => {
    const nodos = [
      nodo({ id: 'p', tipo: 'constante' }),
      nodo({ id: 'm', tipo: 'calculo', op: 'multiplicar', de: ['p', 'p'] }),
    ]
    expect([...pctsExclusivos(nodos, porIdDe(nodos), medidor())]).toEqual(['p'])
  })

  it('con un id repetido manda el tipo del último nodo, como el índice del motor', () => {
    const nodos = [
      nodo({ id: 'p', tipo: 'constante' }),
      nodo({ id: 'p', tipo: 'tabla', tabla: 'x', match: {}, columna: 'v' }),
      par('m', 'p'),
    ]
    expect(pctsExclusivos(nodos, porIdDe(nodos), medidor()).size).toBe(0)
  })
})
