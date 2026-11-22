import { describe, expect, it } from 'vitest'
import type { CalculoDeLaTarjeta } from '../calculo-de-la-tarjeta'
import { tarjetaDesde, type TarjetaLista } from './lectura-de-la-tarjeta'
import { calculoDePrueba, CONTEXTO_DE_PRUEBA, crudaDeLaTarjeta } from './tarjeta.soporte'
import {
  datoDibujado,
  fueraDeLaVersion,
  parteDibujada,
  tieneValor,
  type EntradaDelContenido,
} from './valor-del-dato'

const TARJETA = ((): TarjetaLista => {
  const l = tarjetaDesde(crudaDeLaTarjeta())
  if (l?.estado !== 'lista') throw new Error('la tarjeta de prueba no se lee')
  return l
})()

const entrada = (
  calculo: CalculoDeLaTarjeta = calculoDePrueba(),
  titulo: string | null = null,
): EntradaDelContenido => ({
  tarjeta: TARJETA,
  calculo,
  contexto: { ...CONTEXTO_DE_PRUEBA, titulo },
  monedaBs: 'BOB',
  locale: 'es-BO',
})

const monto = (nodo: string) => ({ tipo: 'dato', nodo, mostrar: 'monto' }) as const

describe('tieneValor', () => {
  it('un texto tiene valor si no queda vacío sin los espacios de los bordes', () => {
    const titulo = { tipo: 'dato', variable: 'titulo' } as const
    expect(tieneValor(entrada(calculoDePrueba(), 'Para Juan'), titulo)).toBe(true)
    expect(tieneValor(entrada(calculoDePrueba(), ' \n '), titulo)).toBe(false)
    expect(tieneValor(entrada(), titulo)).toBe(false)
  })

  it('un número tiene valor, también el 0; un monto nulo no, y un nodo que no aplica tampoco', () => {
    const c = calculoDePrueba({
      valores: new Map([
        ['remate', 0],
        ['flete', null],
        ['fees', 10],
      ]),
    })
    expect(tieneValor(entrada(c), monto('remate'))).toBe(true)
    expect(tieneValor(entrada(c), monto('flete'))).toBe(false)
    expect(tieneValor(entrada(c), monto('fees'))).toBe(false)
    // La etiqueta de un nodo que aplica tiene valor; su descripción nula, no.
    expect(tieneValor(entrada(c), { tipo: 'dato', nodo: 'remate', mostrar: 'etiqueta' })).toBe(true)
    expect(tieneValor(entrada(c), { tipo: 'dato', nodo: 'garantia', mostrar: 'descripcion' })).toBe(
      false,
    )
  })
})

describe('datoDibujado y fueraDeLaVersion', () => {
  it('un monto nulo se dibuja «—»; uno que no aplica, vacío', () => {
    const c = calculoDePrueba({ valores: new Map([['flete', null]]) })
    expect(datoDibujado(entrada(c), monto('flete'))).toEqual({ tipo: 'texto', lineas: ['—'] })
    expect(datoDibujado(entrada(c), monto('fees'))).toEqual({ tipo: 'texto', lineas: [] })
  })

  it('un nodo sin estado no está en la versión, salvo el total; sin estados, todos están', () => {
    expect(fueraDeLaVersion(entrada(), 'ya_no_esta')).toBe(true)
    expect(fueraDeLaVersion(entrada(), 'remate')).toBe(false)
    expect(fueraDeLaVersion(entrada(calculoDePrueba({ estados: new Map() })), 'total')).toBe(false)
    expect(fueraDeLaVersion(entrada(calculoDePrueba({ estados: null })), 'ya_no_esta')).toBe(false)
  })
})

describe('parteDibujada (un dato dentro de un texto con datos)', () => {
  const c = calculoDePrueba({
    valores: new Map<string, number | string | null>([
      ['variante', 'gasolina'],
      ['remate', 1000],
      ['flete', 300],
      ['flete_pct', 0.042],
      ['tc_oficial', 6.96],
      ['garantia', null],
      ['total', 1355],
    ]),
  })
  const dato = (nodo: string, mostrar: string) => ({ tipo: 'dato', nodo, mostrar }) as never

  it('cada «qué mostrar» con el formato de una celda «Dato»', () => {
    const mismo = (d: ReturnType<typeof dato>) => {
      const r = datoDibujado(entrada(c), d)
      return r.tipo === 'texto' ? r.lineas.join('\n') : null
    }
    const r = parteDibujada(entrada(c), monto('remate'))
    const m = datoDibujado(entrada(c), monto('remate'))
    expect(m.tipo === 'monto' && typeof r !== 'string' && r.texto === m.texto).toBe(true)
    expect(r).toMatchObject({ valor: 1000, moneda: 'USD' })
    expect(parteDibujada(entrada(c), dato('flete', 'porcentaje'))).toMatch(/^4,2\s?%$/)
    for (const mostrar of [
      'porcentaje',
      'etiqueta',
      'descripcion',
      'tc_nombre',
      'tc_valor',
      'plazo',
    ])
      expect(
        parteDibujada(entrada(c), dato(mostrar === 'porcentaje' ? 'flete' : 'remate', mostrar)),
      ).toBe(mismo(dato(mostrar === 'porcentaje' ? 'flete' : 'remate', mostrar)))
    expect(parteDibujada(entrada(c), dato('remate', 'tc_nombre'))).toBe('Dólar oficial')
    expect(parteDibujada(entrada(c), { tipo: 'dato', variable: 'numero' })).toBe('12')
  })

  it('sin valor o si el nodo no aplica no escribe nada (nunca «—»)', () => {
    expect(parteDibujada(entrada(c), monto('garantia'))).toBe('')
    expect(parteDibujada(entrada(c), monto('fees'))).toBe('')
    expect(parteDibujada(entrada(c), dato('fees', 'etiqueta'))).toBe('')
    expect(parteDibujada(entrada(c), dato('garantia', 'descripcion'))).toBe('')
    expect(parteDibujada(entrada(), dato('flete', 'porcentaje'))).toBe('')
    expect(parteDibujada(entrada(), { tipo: 'dato', variable: 'cliente_nombre' })).toBe('')
  })
})
