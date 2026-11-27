import { describe, expect, it } from 'vitest'
import {
  cadenaDeLaUnidad,
  caminoPrincipal,
  CLAVE_SIN_FASE,
  claveDePasada,
  type FaseDelCamino,
  type PasadaLeida,
  type PedidoDeLaCadena,
} from './cadena'

const fase = (
  id: string,
  orden: number,
  salidas: string[] = [],
  extra: Partial<FaseDelCamino> = {},
): FaseDelCamino => ({
  id,
  nombre: id.toUpperCase(),
  color: '#000',
  orden,
  esInicial: false,
  esFinal: false,
  activa: true,
  salidas,
  ...extra,
})

// a → b → c → d (final); b también va a e (orden 5, rama) y a f (orden 2: igual que c, empata por id) y vuelve a a.
const FASES = [
  fase('a', 1, ['b'], { esInicial: true }),
  fase('b', 2, ['c', 'e', 'a']),
  fase('c', 3, ['d']),
  fase('d', 4, [], { esFinal: true }),
  fase('e', 5, []),
  fase('i2', 0, ['a'], { esInicial: true }),
  fase('vieja', 9, [], { esInicial: true, activa: false }),
]

const pasada = (
  historialId: number,
  aFaseId: string,
  entro: string,
  extra: Partial<PasadaLeida> = {},
): PasadaLeida => ({
  historialId,
  aFaseId,
  nombre: aFaseId.toUpperCase(),
  color: '#111',
  activa: true,
  entro,
  quienId: null,
  quien: null,
  nota: null,
  ...extra,
})

const actualEn = (faseId: string | null, extra: Partial<PedidoDeLaCadena['actual']> = {}) => ({
  faseId,
  nombre: faseId?.toUpperCase() ?? null,
  color: '#222',
  activa: true,
  desde: '2026-11-20T00:00:00Z',
  ...extra,
})

describe('caminoPrincipal', () => {
  it('sigue la salida activa de menor orden mayor hasta la final', () => {
    expect(caminoPrincipal('a', FASES).map((f) => f.id)).toEqual(['b', 'c', 'd'])
  })

  it('en una rama elige el menor orden e ignora la salida que retrocede', () => {
    expect(caminoPrincipal('b', FASES).map((f) => f.id)).toEqual(['c', 'd'])
  })

  it('empata por id con el mismo orden', () => {
    const fases = [fase('x', 1, ['z', 'y']), fase('z', 2), fase('y', 2)]
    expect(caminoPrincipal('x', fases).map((f) => f.id)).toEqual(['y'])
  })

  it('para sin salidas, en la final y con una fase que no es del flujo', () => {
    expect(caminoPrincipal('e', FASES)).toEqual([])
    expect(caminoPrincipal('d', FASES)).toEqual([])
    expect(caminoPrincipal('otra', FASES)).toEqual([])
  })

  it('salta una salida jubilada', () => {
    const fases = [fase('x', 1, ['y', 'z']), fase('y', 2, [], { activa: false }), fase('z', 3)]
    expect(caminoPrincipal('x', fases).map((f) => f.id)).toEqual(['z'])
  })

  it('sin fase: todas las iniciales activas por orden', () => {
    expect(caminoPrincipal(null, FASES).map((f) => f.id)).toEqual(['i2', 'a'])
  })
})

describe('cadenaDeLaUnidad', () => {
  it('pone las pasadas en orden de entrada, sin juntar las repetidas, y la última entrada es la de la actual', () => {
    const cadena = cadenaDeLaUnidad({
      // Como se leen: de la más nueva a la más vieja.
      pasadas: [
        pasada(4, 'b', '2026-11-20T00:00:00Z', { quien: 'Ana', nota: 'Vuelve' }),
        pasada(3, 'a', '2026-11-15T00:00:00Z', { quien: 'Beto', nota: 'Faltaba el BL' }),
        pasada(2, 'b', '2026-11-10T00:00:00Z', { quien: null }),
        pasada(1, 'a', '2026-11-01T00:00:00Z', { quien: 'Ana' }),
      ],
      hayMas: false,
      actual: actualEn('b'),
      fases: FASES,
    })
    expect(cadena.nodos.map((n) => `${n.tipo}:${n.faseId ?? '-'}`)).toEqual([
      'pasada:a',
      'pasada:b',
      'pasada:a',
      'actual:b',
      'falta:c',
      'falta:d',
    ])
    const [primera, segunda, tercera, actual] = cadena.nodos
    expect(primera).toMatchObject({
      clave: claveDePasada(1),
      entro: '2026-11-01T00:00:00Z',
      salio: '2026-11-10T00:00:00Z',
      quienEntro: 'Ana',
      quienSalio: null,
    })
    expect(segunda?.clave).toBe(claveDePasada(2))
    // La última pasada sale cuando entra a la actual: quién la sacó y con qué nota es la entrada de la actual.
    expect(tercera).toMatchObject({
      salio: '2026-11-20T00:00:00Z',
      quienSalio: 'Ana',
      notaSalio: 'Vuelve',
    })
    expect(actual).toMatchObject({
      clave: 'b',
      quienEntro: 'Ana',
      notaEntro: 'Vuelve',
      entro: '2026-11-20T00:00:00Z',
    })
    expect(cadena.hayAnteriores).toBe(false)
  })

  it('si la última entrada no es de la actual, todas son pasadas', () => {
    const cadena = cadenaDeLaUnidad({
      pasadas: [pasada(1, 'a', '2026-11-01T00:00:00Z')],
      hayMas: false,
      actual: actualEn('c'),
      fases: FASES,
    })
    expect(cadena.nodos.map((n) => n.tipo)).toEqual(['pasada', 'actual', 'falta'])
    expect(cadena.nodos[0]?.salio).toBeNull()
  })
})

describe('cadenaDeLaUnidad con fases jubiladas o sin fase', () => {
  it('marca la actual jubilada y calcula el camino igual', () => {
    const fases = [...FASES, fase('j', 2, ['c'], { activa: false })]
    const cadena = cadenaDeLaUnidad({
      pasadas: [],
      hayMas: false,
      actual: actualEn('j', { activa: false }),
      fases,
    })
    expect(cadena.nodos[0]).toMatchObject({ tipo: 'actual', jubilada: true })
    expect(cadena.nodos.slice(1).map((n) => n.faseId)).toEqual(['c', 'd'])
  })

  it('una pasada de una fase jubilada o de otro flujo usa lo embebido', () => {
    const cadena = cadenaDeLaUnidad({
      pasadas: [
        pasada(1, 'de-otro-flujo', '2026-11-01T00:00:00Z', {
          nombre: 'Puerto viejo',
          activa: false,
        }),
      ],
      hayMas: false,
      actual: actualEn('a'),
      fases: FASES,
    })
    expect(cadena.nodos[0]).toMatchObject({
      nombre: 'Puerto viejo',
      jubilada: true,
      tipo: 'pasada',
    })
  })

  it('sin fase: «Sin fase» como actual y las iniciales como lo que falta', () => {
    const cadena = cadenaDeLaUnidad({
      pasadas: [],
      hayMas: false,
      actual: actualEn(null),
      fases: FASES,
    })
    expect(cadena.nodos[0]).toMatchObject({
      clave: CLAVE_SIN_FASE,
      nombre: 'Sin fase',
      tipo: 'actual',
      jubilada: false,
    })
    expect(cadena.nodos.slice(1).map((n) => n.faseId)).toEqual(['i2', 'a'])
  })
})

describe('cadenaDeLaUnidad en los bordes', () => {
  it('en la final no falta nada', () => {
    const cadena = cadenaDeLaUnidad({
      pasadas: [],
      hayMas: false,
      actual: actualEn('d'),
      fases: FASES,
    })
    expect(cadena.nodos.map((n) => n.tipo)).toEqual(['actual'])
  })

  it('el tope cortó: hay anteriores', () => {
    const cadena = cadenaDeLaUnidad({
      pasadas: [pasada(9, 'a', '2026-11-01T00:00:00Z')],
      hayMas: true,
      actual: actualEn('a'),
      fases: FASES,
    })
    expect(cadena.hayAnteriores).toBe(true)
  })

  it('sin el flujo: pasadas y actual, sin lo que falta; sin el historial: la actual y lo que falta', () => {
    const sinFlujo = cadenaDeLaUnidad({
      pasadas: [pasada(1, 'a', '2026-11-01T00:00:00Z')],
      hayMas: false,
      actual: actualEn('b'),
      fases: null,
    })
    expect(sinFlujo.nodos.map((n) => n.tipo)).toEqual(['pasada', 'actual'])
    expect(sinFlujo.sinCamino).toBe(true)
    const sinHistorial = cadenaDeLaUnidad({
      pasadas: null,
      hayMas: true,
      actual: actualEn('c'),
      fases: FASES,
    })
    expect(sinHistorial.nodos.map((n) => n.tipo)).toEqual(['actual', 'falta'])
    expect(sinHistorial.sinPasadas).toBe(true)
    expect(sinHistorial.hayAnteriores).toBe(false)
  })
})
