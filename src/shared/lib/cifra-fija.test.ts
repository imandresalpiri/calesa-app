import { describe, expect, it } from 'vitest'
import { formatearConDecimales, redondeadaParaMostrar } from './cifra-fija'
import { formatearNumero } from './formato'
import { redondear } from './redondeo'

// Intl separa símbolo y cifra con espacios duros; para comparar se normalizan.
const plano = (texto: string) => texto.replace(/[\u00a0\u202f]/g, ' ')
const es = { locale: 'es-BO' }

describe('redondeadaParaMostrar', () => {
  it('redondea como la base (redondear): mitad lejos de cero', () => {
    for (const [valor, n] of [
      [2.675, 2],
      [-2.5, 0],
      [1234.5649999999998, 2],
      [1.005, 2],
      [-1.005, 2],
    ] as const) {
      expect(redondeadaParaMostrar(valor, 'numero', n)).toBe(redondear(valor, n))
      expect(redondeadaParaMostrar(valor, 'monto', n)).toBe(redondear(valor, n))
    }
  })

  it('un porcentaje redondea los puntos: la fracción con dos decimales más', () => {
    expect(redondeadaParaMostrar(0.14945, 'porcentaje', 1)).toBe(0.149)
    expect(redondeadaParaMostrar(0.1495, 'porcentaje', 1)).toBe(0.15)
    expect(redondeadaParaMostrar(0.14945, 'porcentaje', 2)).toBe(redondear(0.14945, 4))
  })

  it('lo que se ve cero es cero, sin signo', () => {
    expect(Object.is(redondeadaParaMostrar(-0.001, 'numero', 2), 0)).toBe(true)
  })
})

describe('formatearConDecimales', () => {
  it('de 0 a 4 decimales fijos, con ceros de relleno', () => {
    const textos = [0, 1, 2, 3, 4].map((d) =>
      plano(formatearConDecimales(1234.5, 'monto', { ...es, moneda: 'USD', decimales: d })),
    )
    expect(textos).toEqual([
      'USD 1.235',
      'USD 1.234,5',
      'USD 1.234,50',
      'USD 1.234,500',
      'USD 1.234,5000',
    ])
    expect(formatearConDecimales(1234.5678, 'numero', { ...es, decimales: 0 })).toBe('1.235')
    expect(formatearConDecimales(2, 'numero', { ...es, decimales: 3 })).toBe('2,000')
  })

  it('en el casi empate da la cifra de la base, no la de Intl', () => {
    expect(formatearNumero(1234.5649999999998, { ...es, decimales: 2 })).toBe('1.234,56')
    expect(formatearConDecimales(1234.5649999999998, 'numero', { ...es, decimales: 2 })).toBe(
      '1.234,57',
    )
    expect(formatearConDecimales(2.675, 'numero', { ...es, decimales: 2 })).toBe('2,68')
    expect(formatearConDecimales(-2.5, 'numero', { ...es, decimales: 0 })).toBe('-3')
  })

  it('nunca «−0,00»', () => {
    expect(formatearConDecimales(-0.001, 'numero', { ...es, decimales: 2 })).toBe('0,00')
    expect(
      plano(formatearConDecimales(-0.004, 'monto', { ...es, moneda: 'BOB', decimales: 2 })),
    ).toBe('Bs 0,00')
  })

  it('un porcentaje con los decimales de los puntos', () => {
    expect(formatearConDecimales(0.14945, 'porcentaje', { ...es, decimales: 1 })).toBe('14,9%')
    expect(formatearConDecimales(0.14945, 'porcentaje', { ...es, decimales: 2 })).toBe('14,95%')
    expect(formatearConDecimales(0.15, 'porcentaje', { ...es, decimales: 2 })).toBe('15,00%')
    expect(formatearConDecimales(0.1495, 'porcentaje', { ...es, decimales: 0 })).toBe('15%')
  })

  it('un monto sin moneda va como número', () => {
    expect(formatearConDecimales(1234.5, 'monto', { ...es, decimales: 1 })).toBe('1.234,5')
  })
})
