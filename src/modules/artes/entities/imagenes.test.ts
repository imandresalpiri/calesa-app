import { describe, expect, it } from 'vitest'
import {
  textoDeUsos,
  comoSeGuarda,
  MENSAJE_AUN_REDUCIDA,
  MENSAJE_ORIGINAL_PESADO,
  MENSAJE_TIPO_NO_ADMITIDO,
  motivoDeArchivoInvalido,
  motivoDePesoFinal,
  PESO_MAXIMO_IMAGEN_DE_ARTE,
  PESO_MAXIMO_ORIGINAL_DE_ARTE,
  tipoDeImagenDe,
} from './imagenes'

const CHICA = { ancho: 800, alto: 600, peso: 200_000 }

describe('motivoDeArchivoInvalido', () => {
  it('acepta PNG, WebP, JPG y SVG hasta 10 MB', () => {
    for (const tipo of ['image/png', 'image/webp', 'image/jpeg', 'image/svg+xml']) {
      expect(motivoDeArchivoInvalido({ tipo, peso: PESO_MAXIMO_ORIGINAL_DE_ARTE })).toBeNull()
    }
  })

  it('rechaza otro tipo y lo que pesa de más', () => {
    expect(motivoDeArchivoInvalido({ tipo: 'image/gif', peso: 10 })).toBe(MENSAJE_TIPO_NO_ADMITIDO)
    expect(motivoDeArchivoInvalido({ tipo: 'application/pdf', peso: 10 })).toBe(
      MENSAJE_TIPO_NO_ADMITIDO,
    )
    expect(
      motivoDeArchivoInvalido({ tipo: 'image/png', peso: PESO_MAXIMO_ORIGINAL_DE_ARTE + 1 }),
    ).toBe(MENSAJE_ORIGINAL_PESADO)
  })
})

describe('comoSeGuarda', () => {
  it('un SVG, tal cual como SVG', () => {
    expect(comoSeGuarda({ tipo: 'image/svg+xml', conAlfa: true, ...CHICA })).toBe('svg')
  })

  it('sin alfa, siempre WebP', () => {
    for (const tipo of ['image/png', 'image/webp', 'image/jpeg']) {
      expect(comoSeGuarda({ tipo, conAlfa: false, ...CHICA })).toBe('webp')
    }
  })

  it('con alfa, PNG o WebP chico y liviano sube tal cual', () => {
    expect(comoSeGuarda({ tipo: 'image/png', conAlfa: true, ...CHICA })).toBe('tal-cual')
    expect(comoSeGuarda({ tipo: 'image/webp', conAlfa: true, ...CHICA })).toBe('tal-cual')
    expect(
      comoSeGuarda({
        tipo: 'image/png',
        conAlfa: true,
        ancho: 1600,
        alto: 900,
        peso: PESO_MAXIMO_IMAGEN_DE_ARTE,
      }),
    ).toBe('tal-cual')
  })

  it('con alfa y grande o pesado, a PNG; nunca a JPEG', () => {
    expect(comoSeGuarda({ tipo: 'image/png', conAlfa: true, ...CHICA, ancho: 1601 })).toBe('png')
    expect(comoSeGuarda({ tipo: 'image/webp', conAlfa: true, ...CHICA, alto: 4000 })).toBe('png')
    expect(
      comoSeGuarda({
        tipo: 'image/png',
        conAlfa: true,
        ...CHICA,
        peso: PESO_MAXIMO_IMAGEN_DE_ARTE + 1,
      }),
    ).toBe('png')
  })
})

describe('tipos y peso final', () => {
  it('el tipo sale de lo que se sube', () => {
    expect(tipoDeImagenDe('image/jpeg')).toBe('jpg')
    expect(tipoDeImagenDe('image/svg+xml')).toBe('svg')
    expect(tipoDeImagenDe('image/gif')).toBeNull()
  })

  it('lo preparado no pasa de 5 MB', () => {
    expect(motivoDePesoFinal(PESO_MAXIMO_IMAGEN_DE_ARTE)).toBeNull()
    expect(motivoDePesoFinal(PESO_MAXIMO_IMAGEN_DE_ARTE + 1)).toBe(MENSAJE_AUN_REDUCIDA)
  })
})

describe('textoDeUsos', () => {
  it('sin usos lo dice', () => {
    expect(textoDeUsos(0)).toBe('Ninguna plantilla de arte la usa.')
  })

  it('una, en singular', () => {
    expect(textoDeUsos(1)).toBe('La usa 1 plantilla. Quítala de esa plantilla antes.')
  })

  it('varias, y más del tope como «100+»', () => {
    expect(textoDeUsos(7)).toBe('La usan 7 plantillas. Quítala de esas plantillas antes.')
    expect(textoDeUsos(101)).toBe('La usan 100+ plantillas. Quítala de esas plantillas antes.')
  })
})
