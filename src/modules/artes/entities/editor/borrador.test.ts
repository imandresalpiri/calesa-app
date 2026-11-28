import { describe, expect, it } from 'vitest'
import { documentoVacio, VERSION_DEL_DOCUMENTO } from '../documento'
import {
  claveDelBorrador,
  leerBorrador,
  queHacerConElBorrador,
  type BorradorDeArte,
} from './borrador'

const VERSION = '2026-11-27T10:00:00.000000+00:00'

function crudo(extra: Record<string, unknown> = {}): string {
  return JSON.stringify({
    documento: documentoVacio(),
    nombre: 'Promo',
    versionBase: VERSION,
    escritoEn: '2026-11-27T10:05:00.000Z',
    ...extra,
  })
}

describe('leer el borrador local', () => {
  it('la clave es por persona y plantilla', () => {
    expect(claveDelBorrador('abc', 'p1')).toBe('artes:borrador:p1:abc')
    expect(claveDelBorrador('abc', 'p2')).not.toBe(claveDelBorrador('abc', 'p1'))
  })

  it('lee uno bueno con su documento ya leído', () => {
    expect(leerBorrador(crudo())).toEqual({
      documento: documentoVacio(),
      nombre: 'Promo',
      versionBase: VERSION,
      escritoEn: '2026-11-27T10:05:00.000Z',
    })
  })

  it('un documento v1 se migra al leerse', () => {
    const v1 = {
      version: 1,
      paginas: [{ id: 'p', fondo: { tipo: 'color', color: '#ffffff' }, capas: [] }],
    }
    expect(leerBorrador(crudo({ documento: v1 }))?.documento.version).toBe(VERSION_DEL_DOCUMENTO)
  })

  it('nada, un JSON roto, otra forma o un documento que no vale: sin borrador', () => {
    expect(leerBorrador(null)).toBeNull()
    expect(leerBorrador('{')).toBeNull()
    expect(leerBorrador(crudo({ nombre: 3 }))).toBeNull()
    expect(leerBorrador(crudo({ versionBase: '' }))).toBeNull()
    expect(leerBorrador(crudo({ documento: { version: 99, paginas: [] } }))).toBeNull()
  })
})

describe('qué hacer con el borrador al abrir', () => {
  const borrador: BorradorDeArte = {
    documento: documentoVacio(),
    nombre: 'Promo',
    versionBase: VERSION,
    escritoEn: '2026-11-27T10:05:00.000Z',
  }

  it('sin borrador, o igual a lo guardado: nada', () => {
    expect(queHacerConElBorrador({ borrador: null, versionActual: VERSION, iguales: false })).toBe(
      'nada',
    )
    expect(queHacerConElBorrador({ borrador, versionActual: VERSION, iguales: true })).toBe('nada')
  })

  it('sobre la versión guardada se repone; sobre una vieja se ofrece', () => {
    expect(queHacerConElBorrador({ borrador, versionActual: VERSION, iguales: false })).toBe(
      'reponer',
    )
    expect(
      queHacerConElBorrador({
        borrador,
        versionActual: '2026-11-27T11:00:00+00:00',
        iguales: false,
      }),
    ).toBe('ofrecer')
  })
})
