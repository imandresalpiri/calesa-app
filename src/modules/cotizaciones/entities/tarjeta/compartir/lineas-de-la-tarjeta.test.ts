import { describe, expect, it } from 'vitest'
import { formatearMonto, formatearMontoSinMoneda } from '@/shared/lib/formato'
import { geometriaDeLaTarjeta } from '../geometria-de-la-tarjeta'
import { tarjetaDesde, type LecturaDeLaTarjeta } from '../lectura-de-la-tarjeta'
import { calculoDePrueba, CONTEXTO_DE_PRUEBA, crudaDeLaTarjeta } from '../tarjeta.soporte'
import { lineasDeLaTarjeta } from './lineas-de-la-tarjeta'

const usd = (v: number) => formatearMonto(v, { moneda: 'USD', locale: 'es-BO' })
const bob = (v: number) => formatearMonto(v, { moneda: 'BOB', locale: 'es-BO' })
const sin = (v: number) => formatearMontoSinMoneda(v, { moneda: 'USD', locale: 'es-BO' })
const sinBs = (v: number) => formatearMontoSinMoneda(v, { moneda: 'BOB', locale: 'es-BO' })
// Una línea con su gemela sin moneda.
const linea = (concepto: string, v: number, segunda: number | null = null) => ({
  concepto,
  monto: usd(v),
  segunda: segunda === null ? null : bob(segunda),
  montoSinMoneda: sin(v),
  segundaSinMoneda: segunda === null ? null : sinBs(segunda),
})

function lineas(l: LecturaDeLaTarjeta, calculo = calculoDePrueba({ verTotalBs: true })) {
  const dibujar = (sinMoneda: boolean) =>
    geometriaDeLaTarjeta({
      lectura: l,
      calculo,
      contexto: CONTEXTO_DE_PRUEBA,
      monedaBs: 'BOB',
      locale: 'es-BO',
      sinMoneda,
    })
  return lineasDeLaTarjeta(dibujar(false), dibujar(true))
}

describe('lineasDeLaTarjeta', () => {
  it('cada monto con su concepto, sin la cabecera, y el total aparte con su segunda línea', () => {
    const l = tarjetaDesde(crudaDeLaTarjeta())
    if (l === null) throw new Error('no se lee')
    expect(lineas(l)).toEqual({
      conceptos: [
        linea('Remate', 1000),
        linea('Flete marítimo', 300),
        linea('GARANTÍA PARA LA PARTICIPACIÓN', 50),
      ],
      total: linea('TOTAL DÓLARES', 1355, 9430.8),
    })
  })

  it('el gemelo sin moneda es el número solo, con los mismos decimales', () => {
    const l = tarjetaDesde(crudaDeLaTarjeta())
    if (l === null) throw new Error('no se lee')
    expect(lineas(l).total).toMatchObject({
      montoSinMoneda: '1.355,00',
      segundaSinMoneda: '9.430,80',
    })
  })

  it('una fila que no aplica no sale: lo que la tarjeta no dibuja no viaja', () => {
    const l = tarjetaDesde(crudaDeLaTarjeta())
    if (l === null) throw new Error('no se lee')
    const texto = JSON.stringify(lineas(l))
    // `fees` vale 0 y su fila se oculta con `no_aplica_o_cero`.
    expect(texto).not.toContain('Fees')
  })

  it('sin plantilla: sólo el total de la de por omisión', () => {
    expect(lineas({ estado: 'sin_plantilla' }, calculoDePrueba())).toEqual({
      conceptos: [],
      total: linea('Total', 1355),
    })
  })
})
