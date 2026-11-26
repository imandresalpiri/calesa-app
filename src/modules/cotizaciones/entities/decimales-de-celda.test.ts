import { describe, expect, it } from 'vitest'
import { formatearConDecimales } from '@/shared/lib/cifra-fija'
import {
  aceptaDecimales,
  datosQueNoSonNumero,
  DECIMALES_DE_CELDA,
  decimalesDe,
  ejemploDeDecimales,
} from './decimales-de-celda'
import { esquemaNodo, MAXIMO_DE_DECIMALES, type Nodo } from './nodos'

const plano = (texto: string) => texto.replace(/[  ]/g, ' ')
const nodo = (n: Record<string, unknown>) => esquemaNodo.parse({ id: 'n', etiqueta: 'N', ...n })

describe('DECIMALES_DE_CELDA', () => {
  it('va de 0 al tope de la forma, de a uno', () => {
    expect(DECIMALES_DE_CELDA).toEqual([0, 1, 2, 3, 4])
    expect(DECIMALES_DE_CELDA.at(-1)).toBe(MAXIMO_DE_DECIMALES)
  })
})

describe('decimalesDe', () => {
  it('sin la clave es «Automático» (undefined), y el 0 es 0', () => {
    expect(decimalesDe(nodo({ tipo: 'input', formato: 'usd' }))).toBeUndefined()
    expect(decimalesDe(nodo({ tipo: 'input', formato: 'usd', decimales: 0 }))).toBe(0)
    expect(decimalesDe(nodo({ tipo: 'constante', formato: 'pct', decimales: 3 }))).toBe(3)
    expect(decimalesDe(undefined)).toBeUndefined()
  })
})

describe('aceptaDecimales', () => {
  it('lo que se muestra como número los ofrece', () => {
    const numericos: Nodo[] = [
      nodo({ tipo: 'input' }),
      nodo({ tipo: 'constante', formato: 'pct' }),
      nodo({ tipo: 'tabla', tabla: 't', match: {}, columna: 'c' }),
      nodo({ tipo: 'tramo', tabla: 't', sobre: 'a', columna: 'c' }),
      nodo({ tipo: 'calculo', op: 'suma', de: ['a'] }),
      nodo({ tipo: 'calculo', op: 'max', de: ['a', 'b'] }),
      nodo({ tipo: 'calculo', op: 'elegir', de: ['a', 'b'], prueba: 'p' }),
      nodo({ tipo: 'tipo_cambio', clave: 'oficial', formato: 'raw' }),
      nodo({ tipo: 'campo_vehiculo', campo: 'anio', formato: 'raw' }),
    ]
    for (const n of numericos) expect(aceptaDecimales(n), `${n.tipo}`).toBe(true)
  })

  it('un interruptor, la variante y una condición se ven como texto: no los ofrecen', () => {
    const textos: Nodo[] = [
      nodo({ tipo: 'bandera' }),
      nodo({
        tipo: 'opcion',
        opciones: [
          { clave: 'a', etiqueta: 'A', titulo: 'A' },
          { clave: 'b', etiqueta: 'B', titulo: 'B' },
        ],
      }),
      nodo({ tipo: 'calculo', op: 'comparar', de: ['a', 'b'], cmp: '>' }),
      nodo({ tipo: 'calculo', op: 'y', de: ['a', 'b'] }),
      nodo({ tipo: 'calculo', op: 'es_opcion', de: ['v'], cmp: '=', clave: 'a' }),
    ]
    for (const n of textos) expect(aceptaDecimales(n), `${n.tipo}`).toBe(false)
  })
})

describe('ejemploDeDecimales', () => {
  it('un monto es 1.234,5678 en su moneda; con 2 y con 0, «USD 1.234,57» y «USD 1.235»', () => {
    const e = ejemploDeDecimales({ formato: 'usd' })
    expect(e).toEqual({ valor: 1234.5678, formato: 'monto', moneda: 'USD' })
    const con = (d: number) =>
      plano(
        formatearConDecimales(e.valor, 'monto', { decimales: d, locale: 'es-BO', moneda: 'USD' }),
      )
    expect(con(2)).toBe('USD 1.234,57')
    expect(con(0)).toBe('USD 1.235')
  })

  it('sin formato es un monto (como `formatoDe`); `moneda` va sin código; un número, sin moneda', () => {
    expect(ejemploDeDecimales({})).toEqual({ valor: 1234.5678, formato: 'monto', moneda: 'USD' })
    expect(ejemploDeDecimales({ formato: 'moneda' }).moneda).toBeUndefined()
    expect(ejemploDeDecimales({ formato: 'raw' })).toEqual({
      valor: 1234.5678,
      formato: 'numero',
      moneda: undefined,
    })
  })

  it('un porcentaje es 0,149456: con 1, «14,9%», con 2, «14,95%»', () => {
    const e = ejemploDeDecimales({ formato: 'pct' })
    expect(e).toEqual({ valor: 0.149456, formato: 'porcentaje', moneda: undefined })
    expect(formatearConDecimales(e.valor, 'porcentaje', { decimales: 1, locale: 'es-BO' })).toBe(
      '14,9%',
    )
    expect(formatearConDecimales(e.valor, 'porcentaje', { decimales: 2, locale: 'es-BO' })).toBe(
      '14,95%',
    )
  })
})

describe('datosQueNoSonNumero', () => {
  const dato = (id: string, campo: string) =>
    nodo({ id, tipo: 'campo_vehiculo', campo, formato: 'raw' })
  const nodos = [
    dato('anio', 'anio'),
    dato('marca', 'marca'),
    dato('modelo', 'modelo'),
    dato('cilindrada', 'cilindrada'),
    dato('color', 'color'),
    dato('valor_fob', 'valor_fob'),
    dato('sin_campo', 'ya_no_esta'),
    nodo({ id: 'remate', tipo: 'input', formato: 'usd' }),
  ]

  it('las columnas comunes de texto y los campos del origen que no son número ni moneda', () => {
    const campos = [
      { clave: 'cilindrada', tipo: 'numero' },
      { clave: 'color', tipo: 'opcion' },
      { clave: 'valor_fob', tipo: 'moneda' },
    ]
    expect([...datosQueNoSonNumero(nodos, campos)].sort()).toEqual(['color', 'marca', 'modelo'])
  })

  it('sin leer los campos del origen, sólo las columnas comunes de texto (lo que no se conoce sigue ofreciéndolos)', () => {
    expect([...datosQueNoSonNumero(nodos, null)].sort()).toEqual(['marca', 'modelo'])
  })
})
