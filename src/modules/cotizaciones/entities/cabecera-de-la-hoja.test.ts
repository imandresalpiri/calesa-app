import { describe, expect, it } from 'vitest'
import {
  cabeceraSeDibuja,
  modoInicial,
  modosDelEncabezado,
  nombreDelModo,
  ofreceVerTotalBs,
  totalBsDelResumen,
  verTotalBsAlAbrir,
} from './cabecera-de-la-hoja'
import { respuestaDePrueba } from './hoja-de-prueba.soporte'
import { juegoDisenos, sembrada, SEMILLAS, type Clave } from './semilla-lectura'

const modo = (clave: string) => ({ clave, nombre: clave.toUpperCase() })

describe('modoInicial', () => {
  it('es el primero de los modos que declara el diseño (P1)', () => {
    expect(modoInicial({ modos: [modo('paralelo'), modo('unificado')] })).toBe('paralelo')
  })

  it('con uno solo, ese; sin modos, nulo', () => {
    expect(modoInicial({ modos: [modo('m1')] })).toBe('m1')
    expect(modoInicial({ modos: [] })).toBeNull()
  })

  it('con el modo por defecto del diseño, ése; si no es de la hoja, el primero', () => {
    const modos = [modo('paralelo'), modo('unificado')]
    expect(modoInicial({ modos, modoPorDefecto: 'unificado' })).toBe('unificado')
    expect(modoInicial({ modos, modoPorDefecto: 'otro' })).toBe('paralelo')
    expect(modoInicial({ modos, modoPorDefecto: null })).toBe('paralelo')
    expect(modoInicial({ modos: [], modoPorDefecto: 'unificado' })).toBeNull()
  })
})

describe('modosDelEncabezado', () => {
  const modos = [modo('a'), modo('b'), modo('c')]
  const claves = (ms: { clave: string }[]) => ms.map((m) => m.clave)

  it('sin modos visibles, todos', () => {
    expect(claves(modosDelEncabezado({ modos, modosVisibles: null }, 'a'))).toEqual(['a', 'b', 'c'])
  })

  it('con modos visibles, ésos en el orden del diseño', () => {
    expect(claves(modosDelEncabezado({ modos, modosVisibles: ['c', 'a'] }, 'a'))).toEqual([
      'a',
      'c',
    ])
  })

  it('el elegido se dibuja aunque no sea visible', () => {
    expect(claves(modosDelEncabezado({ modos, modosVisibles: ['a'] }, 'b'))).toEqual(['a', 'b'])
    expect(claves(modosDelEncabezado({ modos, modosVisibles: ['a'] }, null))).toEqual(['a'])
  })
})

describe('verTotalBsAlAbrir', () => {
  it.each([
    [true, 'BOB', true, true],
    [true, 'BOB', false, false],
    [true, null, true, false],
    [false, 'BOB', true, false],
  ])(
    'ofrece %s, moneda %s, por defecto %s: %s',
    (verTotalBs, monedaBs, verTotalBsPorDefecto, esperado) => {
      expect(verTotalBsAlAbrir({ verTotalBs, monedaBs, verTotalBsPorDefecto })).toBe(esperado)
    },
  )
})

// Un diseño sin las claves por defecto se ve igual que antes: abre con el primer modo, «Ver total» apagado y todos los modos en el encabezado.
describe('un diseño viejo se ve igual', () => {
  type CabeceraCruda = {
    modos?: { clave: string }[]
    ver_total_bs?: boolean
    modo_por_defecto?: string
    ver_total_bs_por_defecto?: boolean
    modos_visibles?: string[]
  }
  const viejos: [string, CabeceraCruda][] = [
    ...(Object.keys(SEMILLAS) as Clave[]).map((clave): [string, CabeceraCruda] => [
      clave,
      sembrada(clave).diseno.cabecera,
    ]),
    ...juegoDisenos.casos
      .filter((c) => c.valida)
      .map((c): [string, CabeceraCruda] => [
        c.nombre,
        (c.diseno as { cabecera: CabeceraCruda }).cabecera,
      ])
      .filter(
        ([, cab]) =>
          cab.modo_por_defecto === undefined &&
          cab.ver_total_bs_por_defecto === undefined &&
          cab.modos_visibles === undefined,
      ),
  ]

  it.each(viejos)('%s', (_, cab) => {
    const modos = cab.modos ?? []
    const cabecera = {
      modos,
      modoPorDefecto: null,
      modosVisibles: null,
      verTotalBs: cab.ver_total_bs ?? false,
      monedaBs: 'BOB',
      verTotalBsPorDefecto: false,
    }
    expect(modoInicial(cabecera)).toBe(modos[0]?.clave ?? null)
    expect(modosDelEncabezado(cabecera, modoInicial(cabecera))).toEqual(modos)
    expect(verTotalBsAlAbrir(cabecera)).toBe(false)
  })

  it('hay diseños viejos que mirar', () => {
    expect(viejos.length).toBeGreaterThan(10)
  })
})

describe('ofreceVerTotalBs (P6)', () => {
  it.each([
    [true, 'BOB', true],
    [true, null, false],
    [false, 'BOB', false],
    [false, null, false],
  ])('el diseño lo ofrece %s y la moneda es %s: %s', (verTotalBs, monedaBs, esperado) => {
    expect(ofreceVerTotalBs({ verTotalBs, monedaBs })).toBe(esperado)
  })
})

describe('totalBsDelResumen', () => {
  it('sin respuesta no hay; con ella y sin valor falta; con valor, el valor', () => {
    expect(totalBsDelResumen(null)).toEqual({ tipo: 'sin_calcular' })
    expect(totalBsDelResumen(respuestaDePrueba())).toEqual({ tipo: 'faltante' })
    const conBs = respuestaDePrueba()
    expect(totalBsDelResumen({ ...conBs, totales: { ...conBs.totales, bs: 69.6 } })).toEqual({
      tipo: 'valor',
      bs: 69.6,
    })
  })
})

describe('nombreDelModo', () => {
  const cabecera = { modos: [modo('paralelo'), modo('unificado')] }

  it('da el nombre del modo elegido; nulo si no hay elegido o no es de la hoja', () => {
    expect(nombreDelModo(cabecera, 'unificado')).toBe('UNIFICADO')
    expect(nombreDelModo(cabecera, null)).toBeNull()
    expect(nombreDelModo(cabecera, 'otro')).toBeNull()
    expect(nombreDelModo({ modos: [] }, 'paralelo')).toBeNull()
  })
})

describe('cabeceraSeDibuja', () => {
  const base = {
    modos: [{ clave: 'a' }, { clave: 'b' }],
    modosVisibles: null,
    verTotalBs: false,
    monedaBs: null,
    ajustes: false,
  }

  it('con dos modos a la vista, con «Ver total» ofrecido o con el ⚙, se dibuja', () => {
    expect(cabeceraSeDibuja(base, 'a')).toBe(true)
    const sinModos = { ...base, modosVisibles: [] }
    expect(cabeceraSeDibuja(sinModos, 'a')).toBe(false)
    expect(cabeceraSeDibuja({ ...sinModos, verTotalBs: true, monedaBs: 'BOB' }, 'a')).toBe(true)
    expect(cabeceraSeDibuja({ ...sinModos, ajustes: true }, 'a')).toBe(true)
  })

  it('«Ver total» sin moneda no cuenta (P6): sin nada más, no se dibuja', () => {
    expect(cabeceraSeDibuja({ ...base, modos: [{ clave: 'a' }], verTotalBs: true }, 'a')).toBe(
      false,
    )
  })
})
