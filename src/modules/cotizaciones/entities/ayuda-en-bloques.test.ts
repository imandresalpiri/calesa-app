import { describe, expect, it } from 'vitest'
import { aceptaValorEnLaHoja, ayudaEnBloques, nodosConCelda } from './ayuda-en-bloques'
import type { AyudaDeDiseno, Diseno } from './diseno'
import type { Nodo } from './nodos'

describe('ayudaEnBloques', () => {
  it('la de antes es un texto (más sus enlaces) o una tabla con todas sus columnas; los bloques, tal cual; sin ayuda, ninguno', () => {
    const enlaces = [{ titulo: 'Copart', url: 'https://www.copart.com/' }]
    expect(ayudaEnBloques({ texto: 'Mira la subasta.', enlaces })).toEqual([
      { tipo: 'texto', texto: 'Mira la subasta.' },
      { tipo: 'enlaces', enlaces },
    ])
    expect(ayudaEnBloques({ texto: 'Mira.' })).toEqual([{ tipo: 'texto', texto: 'Mira.' }])
    expect(ayudaEnBloques({ tabla: 'fletes' })).toEqual([{ tipo: 'tabla', tabla: 'fletes' }])
    const bloques: AyudaDeDiseno = [
      { tipo: 'titulo', texto: 'Fletes' },
      { tipo: 'tabla', tabla: 'fletes', columnas: [{ columna: 'monto', llena: 'flete' }] },
    ]
    expect(ayudaEnBloques(bloques)).toEqual(bloques)
    expect(ayudaEnBloques(undefined)).toEqual([])
  })

  it('devuelve una lista nueva: cambiarla no toca la ayuda del diseño', () => {
    const ayuda = [{ tipo: 'titulo' as const, texto: 'T' }]
    ayudaEnBloques(ayuda).push({ tipo: 'texto', texto: 'otro' })
    expect(ayuda).toHaveLength(1)
  })
})

const N = {
  remate: { id: 'remate', tipo: 'input', etiqueta: 'Remate', formato: 'usd' },
  fees_pct: { id: 'fees_pct', tipo: 'constante', etiqueta: 'Fees (%)', formato: 'pct' },
  fees: {
    id: 'fees',
    tipo: 'calculo',
    op: 'porcentaje_de',
    de: ['remate'],
    pct: 'fees_pct',
    etiqueta: 'Fees',
  },
  flete: {
    id: 'flete',
    tipo: 'tabla',
    tabla: 'fletes',
    match: { tipo: 'remate' },
    columna: 'monto',
    etiqueta: 'Flete',
  },
  total: {
    id: 'total',
    tipo: 'calculo',
    op: 'suma',
    de: ['remate', 'fees'],
    etiqueta: 'Total',
    salida: 'total',
  },
  tc: { id: 'tc', tipo: 'tipo_cambio', clave: 'oficial', etiqueta: 'TC', formato: 'raw' },
  anio: { id: 'anio', tipo: 'campo_vehiculo', campo: 'anio', etiqueta: 'Año', formato: 'raw' },
} as unknown as Record<string, Nodo>

describe('aceptaValorEnLaHoja', () => {
  it('un dato que se tipea, una constante o un cálculo que se puede pisar; el total, el tipo de cambio y un campo del vehículo no', () => {
    const acepta = Object.fromEntries(
      Object.entries(N).map(([id, n]) => [id, aceptaValorEnLaHoja(n)]),
    )
    expect(acepta).toEqual({
      remate: true,
      fees_pct: true,
      fees: true,
      flete: true,
      total: false,
      tc: false,
      anio: false,
    })
  })
})

describe('nodosConCelda', () => {
  it('el nodo de cada celda, en cualquier sección, y el porcentaje de una celda con secundario; ni los atajos ni el subtotal', () => {
    const diseno = {
      secciones: [
        {
          id: 'compra',
          items: [
            { tipo: 'celda', nodo: 'remate', ancho: 'mitad' },
            { tipo: 'celda', nodo: 'fees', ancho: 'mitad', secundario: 'porcentaje' },
            { tipo: 'atajos', nodo: 'flete', columna: 'tipo', filas: 3 },
          ],
        },
        {
          id: 'avanzado',
          items: [
            { tipo: 'celda', nodo: 'flete', ancho: 'completo' },
            { tipo: 'subtotal', nodo: 'total' },
          ],
        },
      ],
    } as unknown as Pick<Diseno, 'secciones'>
    const nodos = new Map(Object.values(N).map((n) => [n.id, n]))
    expect(nodosConCelda(diseno, nodos)).toEqual(['remate', 'fees', 'fees_pct', 'flete'])
  })

  it('sin secundario, el porcentaje de un `porcentaje_de` no tiene celda', () => {
    const diseno = {
      secciones: [{ id: 's', items: [{ tipo: 'celda', nodo: 'fees', ancho: 'completo' }] }],
    } as unknown as Pick<Diseno, 'secciones'>
    expect(nodosConCelda(diseno, new Map(Object.values(N).map((n) => [n.id, n])))).toEqual(['fees'])
  })
})
