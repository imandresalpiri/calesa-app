import { describe, expect, it } from 'vitest'
import { formatearMonto } from '@/shared/lib/formato'
import type { CalculoDeLaTarjeta } from '../calculo-de-la-tarjeta'
import type { ContenidoDeLaCelda } from '../cuadricula-de-la-tarjeta'
import { textoConDatosDibujado } from './contenido-de-la-celda'
import { geometriaDeLaTarjeta, type CeldaDibujada, type Geometria } from './geometria-de-la-tarjeta'
import { tarjetaDesde, type TarjetaLista } from './lectura-de-la-tarjeta'
import { filasDelModo } from './retoques/modo-de-la-tarjeta'
import {
  calculoDePrueba,
  CONTEXTO_DE_PRUEBA,
  crudaDeLaTarjeta,
  DEFINICION_DE_PRUEBA,
} from './tarjeta.soporte'
import { textoDeLaTarjeta } from './texto-de-la-tarjeta'

const LOCALE = 'es-BO'
const usd = (v: number) => formatearMonto(v, { moneda: 'USD', locale: LOCALE })
const PCT = { tipo: 'dato', nodo: 'flete', mostrar: 'porcentaje' } as const
const TOTAL = { tipo: 'dato', nodo: 'total', mostrar: 'monto' } as const
const CALCULO = calculoDePrueba({
  valores: new Map<string, number | string | null>([
    ['variante', 'gasolina'],
    ['remate', 1000],
    ['flete', 300],
    ['flete_pct', 0.042],
    ['ga', 55],
    ['garantia', 50],
    ['total', 1355],
  ]),
})

// La tarjeta de prueba con el contenido de algunas celdas cambiado.
function tarjetaCon(cambios: Record<string, ContenidoDeLaCelda>): TarjetaLista {
  const definicion = {
    ...DEFINICION_DE_PRUEBA,
    celdas: DEFINICION_DE_PRUEBA.celdas.map((c) =>
      c.id in cambios ? { ...c, contenido: cambios[c.id] } : c,
    ),
  }
  const l = tarjetaDesde(crudaDeLaTarjeta({ definicion }))
  if (l?.estado !== 'lista') throw new Error('la tarjeta de prueba no se lee')
  return l
}
const geometria = (l: TarjetaLista, calculo: CalculoDeLaTarjeta = CALCULO) =>
  geometriaDeLaTarjeta({
    lectura: l,
    calculo,
    contexto: CONTEXTO_DE_PRUEBA,
    monedaBs: 'BOB',
    locale: LOCALE,
  })
const celda = (g: Geometria, id: string): CeldaDibujada => {
  const c = g.celdas.find((x) => x.id === id)
  if (c === undefined) throw new Error(`sin la celda ${id}`)
  return c
}
const entrada = (l: TarjetaLista, calculo: CalculoDeLaTarjeta = CALCULO) => ({
  tarjeta: l,
  calculo,
  contexto: CONTEXTO_DE_PRUEBA,
  monedaBs: 'BOB',
  locale: LOCALE,
})

describe('textoConDatosDibujado', () => {
  const l = tarjetaCon({})

  it('«Comisión giro » + el porcentaje, con el formato de una celda «Dato»', () => {
    const r = textoConDatosDibujado(entrada(l), ['Comisión giro ', PCT])
    expect(r.lineas).toHaveLength(1)
    expect(r.lineas[0]).toMatch(/^Comisión giro 4,2\s?%$/)
    expect(r.tramos).toBeUndefined()
  })

  it('un dato sin valor no escribe nada; sin nada, ninguna línea', () => {
    expect(textoConDatosDibujado(entrada(l, calculoDePrueba()), ['Comisión giro ', PCT])).toEqual({
      tipo: 'texto',
      lineas: ['Comisión giro '],
    })
    expect(
      textoConDatosDibujado(entrada(l), [{ tipo: 'dato', variable: 'cliente_nombre' }]),
    ).toEqual({ tipo: 'texto', lineas: [] })
  })

  it('un monto adentro va también en tramos (para el Modo Live), y los saltos de línea se respetan', () => {
    const r = textoConDatosDibujado(entrada(l), [
      'Total:\n',
      TOTAL,
      ' (n.º ',
      { tipo: 'dato', variable: 'numero' },
      ')',
    ])
    expect(r.lineas).toEqual(['Total:', `${usd(1355)} (n.º 12)`])
    expect(r.tramos).toEqual([
      'Total:\n',
      { valor: 1355, moneda: 'USD', texto: usd(1355) },
      ' (n.º 12)',
    ])
  })
})

describe('el texto con datos en la geometría', () => {
  it('lee las partes, las dibuja como texto y marca la celda; no lleva nodo ni variable', () => {
    const g = geometria(tarjetaCon({ c_nota: { tipo: 'texto', partes: ['Comisión giro ', PCT] } }))
    const c = celda(g, 'c_nota')
    expect(c.contenido.tipo === 'texto' && c.contenido.lineas[0]).toMatch(/^Comisión giro 4,2\s?%$/)
    expect(c.marca).toEqual({ conDatos: true })
    expect(celda(g, 'c_asesor_rotulo').marca.conDatos).toBeUndefined()
  })

  it('el rótulo de una fila oculta usa el texto resuelto', () => {
    const g = geometria(
      tarjetaCon({
        c_fees: {
          tipo: 'texto',
          partes: ['Fees de la cotización ', { tipo: 'dato', variable: 'numero' }],
        },
      }),
    )
    expect(g.ocultas.find((o) => o.fila === 'n_fees')?.etiqueta).toBe('Fees de la cotización 12')
  })

  it('un texto con un monto no nombra su fila (el Modo Live no taparía la cifra en un nombre): va el siguiente texto o el nodo', () => {
    const g = geometria(tarjetaCon({ c_fees: { tipo: 'texto', partes: ['Fees ', TOTAL] } }))
    expect(g.ocultas.find((o) => o.fila === 'n_fees')?.etiqueta).toBe('Fees')
    const conLaNota = geometria(
      tarjetaCon({ c_asesor_rotulo: { tipo: 'texto', partes: ['Total ', TOTAL] } }),
    )
    const asesor = filasDelModo(conLaNota, new Set()).find((f) => f.id === 'asesor')
    expect(asesor?.rotulo).not.toMatch(/1\.355/)
    expect(asesor?.rotulo).not.toBe('')
  })

  it('«Copiar texto» lo copia con cifras', () => {
    const l = tarjetaCon({ c_nota: { tipo: 'texto', partes: ['Total: ', TOTAL] } })
    expect(textoDeLaTarjeta(geometria(l), l).split('\n\n').at(-1)).toBe(`Total: ${usd(1355)}`)
  })
})
