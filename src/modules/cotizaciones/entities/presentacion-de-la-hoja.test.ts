import { describe, expect, it } from 'vitest'
import type { ContextoDeHoja } from './binding'
import { ENTRADAS_VACIAS, indiceDeHoja } from './entradas'
import { hojaDesde, type CeldaDeHoja, type HojaLista, type SeccionDeHoja } from './hoja'
import { crudaDeLaHoja, respuestaDePrueba } from './hoja-de-prueba.soporte'
import {
  bloquesDeLaAyuda,
  celdaConAjuste,
  celdaConAyuda,
  explicacionDelAvanzado,
  hayDatosPorRevisar,
  ordenDeLaHoja,
  tituloDeLaAyuda,
  titulosDeAvanzado,
} from './presentacion-de-la-hoja'

const celda = (nodo: string, mas: Record<string, unknown> = {}) => ({
  tipo: 'celda',
  nodo,
  etiqueta: nodo.toUpperCase(),
  tipo_nodo: 'input',
  ajustes: false,
  ancho: 'completo',
  formato: 'usd',
  editable: true,
  ...mas,
})

// Sin título, la clave no viaja (la base no manda nulos).
const seccion = (id: string, presentacion: string, titulo: string | null, items: unknown[]) => ({
  id,
  ...(titulo === null ? {} : { titulo }),
  presentacion,
  items,
})

// Principal, avanzada, principal, avanzada: las dos avanzadas van juntas, donde estaba la primera.
function hojaCon(secciones: unknown[]): HojaLista {
  const hoja = hojaDesde({ ...crudaDeLaHoja(), secciones })
  if (hoja?.estado !== 'lista') {
    throw new Error('La hoja de prueba no se leyó.')
  }
  return hoja
}

const DOS_AVANZADAS = hojaCon([
  seccion('a', 'principal', 'A', [celda('a1')]),
  seccion('x', 'avanzado', 'Componentes CIF', [
    celda('x1', { ayuda: [{ tipo: 'texto', texto: 'Cómo se usa x1' }] }),
  ]),
  seccion('b', 'principal', 'B', [
    celda('b1', { ayuda: [{ tipo: 'texto', texto: 'Cómo se usa b1' }] }),
  ]),
  seccion('y', 'avanzado', 'Póliza', [
    celda('y1', { ayuda: [{ tipo: 'tabla', tabla: 'poliza' }] }),
  ]),
])

const contexto = (
  hoja: HojaLista,
  respuesta: ReturnType<typeof respuestaDePrueba> | null = respuestaDePrueba({
    valores: { a1: 1, x1: 2, b1: 3, y1: 4 },
  }),
): ContextoDeHoja => ({
  indice: indiceDeHoja(hoja.secciones),
  entradas: ENTRADAS_VACIAS,
  respuesta,
})

const ids = (secciones: readonly SeccionDeHoja[]) => secciones.map((s) => s.id)

describe('ordenDeLaHoja: el botón «Avanzado» va donde estaba la primera avanzada', () => {
  it('las principales en su orden y las avanzadas juntas en el lugar de la primera', () => {
    const orden = ordenDeLaHoja(DOS_AVANZADAS.secciones)
    expect(orden.map((l) => l.tipo)).toEqual(['seccion', 'avanzado', 'seccion'])
    const avanzado = orden[1]
    expect(avanzado?.tipo === 'avanzado' ? ids(avanzado.secciones) : null).toEqual(['x', 'y'])
    expect(orden.flatMap((l) => (l.tipo === 'seccion' ? [l.seccion.id] : []))).toEqual(['a', 'b'])
  })

  it('sin ninguna avanzada no hay botón', () => {
    const hoja = hojaCon([seccion('a', 'principal', 'A', [celda('a1')])])
    expect(ordenDeLaHoja(hoja.secciones).map((l) => l.tipo)).toEqual(['seccion'])
  })

  it('una sola avanzada al principio abre el orden con el botón', () => {
    const hoja = hojaCon([
      seccion('x', 'avanzado', 'X', [celda('x1')]),
      seccion('a', 'principal', 'A', [celda('a1')]),
    ])
    expect(ordenDeLaHoja(hoja.secciones).map((l) => l.tipo)).toEqual(['avanzado', 'seccion'])
  })

  it('sin secciones no hay nada', () => {
    expect(ordenDeLaHoja([])).toEqual([])
  })
})

describe('titulosDeAvanzado: lo que dice el botón de lo que esconde', () => {
  it('los títulos en su orden, separados por « · »', () => {
    expect(
      titulosDeAvanzado(DOS_AVANZADAS.secciones.filter((s) => s.presentacion === 'avanzado')),
    ).toBe('Componentes CIF · Póliza')
  })

  it('una sección sin título no se nombra', () => {
    const hoja = hojaCon([
      seccion('x', 'avanzado', null, [celda('x1')]),
      seccion('y', 'avanzado', 'Póliza', [celda('y1')]),
    ])
    expect(titulosDeAvanzado(hoja.secciones)).toBe('Póliza')
  })

  it('sin ningún título, nada', () => {
    const hoja = hojaCon([seccion('x', 'avanzado', null, [celda('x1')])])
    expect(titulosDeAvanzado(hoja.secciones)).toBe('')
  })
})

describe('hayDatosPorRevisar: un aviso en lo que el botón esconde', () => {
  const avanzadas = DOS_AVANZADAS.secciones.filter((s) => s.presentacion === 'avanzado')

  it('con un dato que falta en una celda de «Avanzado», sí', () => {
    const c = contexto(DOS_AVANZADAS, respuestaDePrueba({ valores: { a1: 1, b1: 3, y1: 4 } }))
    expect(hayDatosPorRevisar(avanzadas, c)).toBe(true)
  })

  it('con todo al día en «Avanzado», no', () => {
    expect(hayDatosPorRevisar(avanzadas, contexto(DOS_AVANZADAS))).toBe(false)
  })

  it('un aviso en una celda de la hoja no cuenta', () => {
    const c = contexto(DOS_AVANZADAS, respuestaDePrueba({ valores: { x1: 2, y1: 4 } }))
    expect(hayDatosPorRevisar(avanzadas, c)).toBe(false)
  })

  it('sin respuesta no hay aviso que dar', () => {
    expect(hayDatosPorRevisar(avanzadas, contexto(DOS_AVANZADAS, null))).toBe(false)
  })
})

describe('tituloDeLaAyuda y bloquesDeLaAyuda: el primer título es el del panel', () => {
  const de = (nodo: string): CeldaDeHoja => {
    const c = contexto(DOS_AVANZADAS).indice.celdas.get(nodo)
    if (!c) {
      throw new Error(`No hay ${nodo}`)
    }
    return c
  }
  const enlaces = [{ titulo: 'Copart', url: 'https://www.copart.com/' }]

  it('sin bloque de título, «Ayuda de <rótulo>» y todos los bloques en el cuerpo', () => {
    expect(tituloDeLaAyuda(de('b1'))).toBe('Ayuda de B1')
    expect(bloquesDeLaAyuda(de('b1'))).toEqual([{ tipo: 'texto', texto: 'Cómo se usa b1' }])
  })

  it('con títulos, el primero va arriba y no se repite; los demás quedan en su lugar', () => {
    const celda = {
      ...de('b1'),
      ayuda: [
        { tipo: 'texto' as const, texto: 'Antes' },
        { tipo: 'titulo' as const, texto: 'Cómo se calcula' },
        { tipo: 'enlaces' as const, enlaces },
        { tipo: 'titulo' as const, texto: 'Otro' },
      ],
    }
    expect(tituloDeLaAyuda(celda)).toBe('Cómo se calcula')
    expect(bloquesDeLaAyuda(celda)).toEqual([
      { tipo: 'texto', texto: 'Antes' },
      { tipo: 'enlaces', enlaces },
      { tipo: 'titulo', texto: 'Otro' },
    ])
  })

  it('sin ayuda, ningún bloque', () => {
    expect(bloquesDeLaAyuda(de('a1'))).toEqual([])
  })
})

describe('celdaConAyuda: la URL no abre lo que la hoja no muestra', () => {
  const c = contexto(DOS_AVANZADAS)
  const principales = DOS_AVANZADAS.secciones.filter((s) => s.presentacion === 'principal')
  const avanzadas = DOS_AVANZADAS.secciones.filter((s) => s.presentacion === 'avanzado')

  it('encuentra la celda con ayuda (de texto o de una tabla) en las secciones que se miran', () => {
    expect(celdaConAyuda(principales, 'b1', c)?.nodo).toBe('b1')
    expect(celdaConAyuda(avanzadas, 'x1', c)?.nodo).toBe('x1')
    expect(celdaConAyuda(avanzadas, 'y1', c)?.nodo).toBe('y1')
  })

  it('una celda de otra parte (la de «Avanzado» con el modal cerrado) no se abre', () => {
    expect(celdaConAyuda(principales, 'x1', c)).toBeNull()
    expect(celdaConAyuda(principales, 'y1', c)).toBeNull()
  })

  it('una celda sin ayuda, un id inventado o la falta de nodo no abren nada', () => {
    expect(celdaConAyuda(principales, 'a1', c)).toBeNull()
    expect(celdaConAyuda(principales, 'no_existe', c)).toBeNull()
    expect(celdaConAyuda(principales, null, c)).toBeNull()
  })
})

describe('celdaConAjuste: el ⚙ lo da la base y la URL no abre lo que la hoja no muestra', () => {
  const par = {
    nodo: 'p1',
    como: 'porcentaje',
    tipo_nodo: 'input',
    formato: 'pct',
    ajustes: true,
    editable: true,
  }
  const hoja = hojaCon([
    seccion('a', 'principal', 'A', [
      celda('a1'),
      celda('a2', { ajustes: true }),
      celda('a3', { secundario: par }),
      celda('a4', { secundario: { ...par, ajustes: false } }),
    ]),
    seccion('x', 'avanzado', 'Avanzado', [celda('x1', { ajustes: true })]),
  ])
  const c = contexto(hoja, respuestaDePrueba({ valores: { a1: 1, a2: 2, a3: 3, a4: 4, x1: 5 } }))
  const principales = hoja.secciones.filter((s) => s.presentacion === 'principal')
  const avanzadas = hoja.secciones.filter((s) => s.presentacion === 'avanzado')

  it('encuentra la celda con ajustes propios o los de su secundario, en las secciones que se miran', () => {
    expect(celdaConAjuste(principales, 'a2', c)?.nodo).toBe('a2')
    expect(celdaConAjuste(principales, 'a3', c)?.nodo).toBe('a3')
    expect(celdaConAjuste(avanzadas, 'x1', c)?.nodo).toBe('x1')
  })

  it('una celda de otra parte (la de «Avanzado» con el modal cerrado) no se abre', () => {
    expect(celdaConAjuste(principales, 'x1', c)).toBeNull()
    expect(celdaConAjuste(avanzadas, 'a2', c)).toBeNull()
  })

  it('una celda sin ajustes, con un secundario sin ajustes, un id inventado o sin nodo no abren nada', () => {
    expect(celdaConAjuste(principales, 'a1', c)).toBeNull()
    expect(celdaConAjuste(principales, 'a4', c)).toBeNull()
    expect(celdaConAjuste(principales, 'no_existe', c)).toBeNull()
    expect(celdaConAjuste(principales, null, c)).toBeNull()
  })
})

describe('explicacionDelAvanzado', () => {
  const seccion = (items: Record<string, unknown>[]) =>
    ({ id: 'x', titulo: null, presentacion: 'avanzado', items }) as unknown as SeccionDeHoja

  it('a todos, qué cambia tocar un valor; con el ⚙ en alguna celda (o en su secundario), también qué cambia el ⚙', () => {
    const sin = [seccion([{ tipo: 'celda', ajustes: false, secundario: null }])]
    const conCelda = [seccion([{ tipo: 'celda', ajustes: true, secundario: null }])]
    const conSecundario = [
      seccion([{ tipo: 'celda', ajustes: false, secundario: { ajustes: true } }]),
    ]
    const solo = 'Tocar un valor lo cambia sólo en esta cotización.'
    const ambas = `${solo} El ⚙ cambia el valor por defecto de las cotizaciones nuevas.`
    expect(explicacionDelAvanzado(sin, true)).toBe(solo)
    expect(explicacionDelAvanzado(conCelda, true)).toBe(ambas)
    expect(explicacionDelAvanzado(conSecundario, true)).toBe(ambas)
    // Sin el hueco del ⚙ lleno, ninguna celda lo dibuja.
    expect(explicacionDelAvanzado(conCelda, false)).toBe(solo)
  })
})
