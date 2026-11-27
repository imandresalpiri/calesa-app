import { describe, expect, it } from 'vitest'
import {
  claveDeFase,
  CLAVE_DE_SIN_FASE,
  codificarCursorDeLaFase,
  faseDeLaClave,
  leerCursorDeLaFase,
  rutaDeLaFase,
} from './fase'

const A = '11111111-1111-4111-8111-111111111111'
const O = '22222222-2222-4222-8222-222222222222'
const INSTANTE = '2026-11-14T10:00:00.123456+00:00'

describe('la clave de una fase', () => {
  it('es su id, o sin_fase para «Sin fase»', () => {
    expect(claveDeFase(A)).toBe(A)
    expect(claveDeFase(null)).toBe(CLAVE_DE_SIN_FASE)
  })

  it('se lee de vuelta: un guid, sin_fase o nada', () => {
    expect(faseDeLaClave(A)).toEqual({ faseId: A })
    expect(faseDeLaClave('sin_fase')).toEqual({ faseId: null })
    for (const mala of ['', 'abc', 'sin-fase', '123', null, undefined, `${A}x`]) {
      expect(faseDeLaClave(mala)).toBeNull()
    }
  })
})

describe('rutaDeLaFase', () => {
  it('lleva a la lista de la fase con su origen', () => {
    expect(rutaDeLaFase(O, A)).toBe(`/logistica/fase/${A}?origen=${O}`)
    expect(rutaDeLaFase(O, CLAVE_DE_SIN_FASE)).toBe(`/logistica/fase/sin_fase?origen=${O}`)
  })

  it('sin origen (una URL vieja), la lista elige el suyo', () => {
    expect(rutaDeLaFase(null, A)).toBe(`/logistica/fase/${A}`)
    expect(rutaDeLaFase(null, A, { demoradas: true })).toBe(`/logistica/fase/${A}?demoradas=si`)
  })

  it('conserva los filtros con la forma de la URL de la lista', () => {
    const ruta = rutaDeLaFase(O, A, {
      q: 'hilux 2',
      demoradas: true,
      por_aprobar: true,
      contenedor: O,
      embarque: A,
      naviera: A,
    })
    const consulta = new URLSearchParams(ruta.split('?')[1])
    expect(Object.fromEntries(consulta)).toEqual({
      origen: O,
      q: 'hilux 2',
      demoradas: 'si',
      por_aprobar: 'si',
      contenedor: O,
      embarque: A,
      naviera: A,
    })
  })
})

describe('el cursor de una fase', () => {
  it('va y vuelve: con fecha en una fase y sin ella en «Sin fase»', () => {
    const deFase = codificarCursorDeLaFase({ desde: INSTANTE, id: A })
    expect(leerCursorDeLaFase(deFase, { sinFase: false })).toEqual({ desde: INSTANTE, id: A })
    const sinFase = codificarCursorDeLaFase({ desde: null, id: A })
    expect(leerCursorDeLaFase(sinFase, { sinFase: true })).toEqual({ desde: null, id: A })
  })

  it('viaja en base64url, sin + ni / ni =', () => {
    expect(codificarCursorDeLaFase({ desde: INSTANTE, id: A })).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('el de una fase no sirve en «Sin fase» ni al revés', () => {
    expect(
      leerCursorDeLaFase(codificarCursorDeLaFase({ desde: INSTANTE, id: A }), { sinFase: true }),
    ).toBeNull()
    expect(
      leerCursorDeLaFase(codificarCursorDeLaFase({ desde: null, id: A }), { sinFase: false }),
    ).toBeNull()
  })

  it('uno ilegible, sin guid o con una fecha mala es la primera página', () => {
    const base = (t: string) => btoa(t).replaceAll('=', '')
    for (const malo of [
      '',
      null,
      undefined,
      'no es un cursor!',
      'abc',
      base(`${INSTANTE}|no-es-guid`),
      base(`ayer|${A}`),
      base(`${INSTANTE}|${A}|extra`),
      base(A),
    ]) {
      expect(leerCursorDeLaFase(malo, { sinFase: false })).toBeNull()
    }
  })
})
