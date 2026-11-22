import { describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import {
  ajustesDeCotizacionDesde,
  MOTIVO_DE_VIGENCIA_INVALIDA,
  puedeCambiarAjustesDeCotizacion,
  textoDeLaVigencia,
  validarVigencia,
} from './ajustes-de-cotizacion'

const USA = '11111111-1111-4111-8111-111111111111'
const COREA = '22222222-2222-4222-8222-222222222222'

describe('ajustesDeCotizacionDesde', () => {
  it('pasa la fila a camelCase con la versión intacta, microsegundos incluidos', () => {
    expect(
      ajustesDeCotizacionDesde({
        vigencia_dias: 30,
        actualizado_en: '2026-11-08T05:35:30.123456+00:00',
      }),
    ).toStrictEqual({
      vigenciaDias: 30,
      actualizadoEn: '2026-11-08T05:35:30.123456+00:00',
    })
  })
})

describe('puedeCambiarAjustesDeCotizacion', () => {
  it('con cotizaciones.configurar sin origen, sí', () => {
    const permisos: Permisos = [
      { clave: 'cotizaciones.configurar', origenId: USA, alcance: 'todos' },
      { clave: 'cotizaciones.configurar', origenId: null, alcance: 'todos' },
    ]
    expect(puedeCambiarAjustesDeCotizacion(permisos)).toBe(true)
  })

  it('con la clave en uno o en dos orígenes, no: valen para todos', () => {
    expect(
      puedeCambiarAjustesDeCotizacion([
        { clave: 'cotizaciones.configurar', origenId: USA, alcance: 'todos' },
      ]),
    ).toBe(false)
    expect(
      puedeCambiarAjustesDeCotizacion([
        { clave: 'cotizaciones.configurar', origenId: USA, alcance: 'todos' },
        { clave: 'cotizaciones.configurar', origenId: COREA, alcance: 'todos' },
      ]),
    ).toBe(false)
  })

  it('sin la clave, no, aunque gestione los ajustes de la empresa', () => {
    expect(
      puedeCambiarAjustesDeCotizacion([
        { clave: 'empresa.ajustes.gestionar', origenId: null, alcance: 'todos' },
        { clave: 'cotizaciones.ver', origenId: null, alcance: 'todos' },
      ]),
    ).toBe(false)
  })
})

describe('validarVigencia', () => {
  it('acepta los días enteros de 1 a 365, con espacios de más', () => {
    expect(validarVigencia('30')).toStrictEqual({ ok: true, dias: 30 })
    expect(validarVigencia(' 1 ')).toStrictEqual({ ok: true, dias: 1 })
    expect(validarVigencia('365')).toStrictEqual({ ok: true, dias: 365 })
  })

  it('rechaza lo que no es un entero del rango, con el motivo de la base', () => {
    for (const texto of ['', '0', '366', '-3', '1.5', '1e2', 'abc', '1000']) {
      expect(validarVigencia(texto), texto).toStrictEqual({
        ok: false,
        motivo: MOTIVO_DE_VIGENCIA_INVALIDA,
      })
    }
    expect(MOTIVO_DE_VIGENCIA_INVALIDA).toBe('La vigencia va de 1 a 365 días.')
  })
})

describe('textoDeLaVigencia', () => {
  it('dice «día» en singular', () => {
    expect(textoDeLaVigencia(1)).toBe('1 día')
    expect(textoDeLaVigencia(30)).toBe('30 días')
  })
})
