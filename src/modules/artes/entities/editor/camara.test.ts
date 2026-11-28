import { describe, expect, it } from 'vitest'
import {
  acotarEscala,
  alCien,
  alDocumento,
  aPantalla,
  desplazar,
  escalaParaAjustar,
  factorDeLaRueda,
  textoDelZoom,
  ZOOM_MAXIMO,
  ZOOM_MINIMO,
  zoomAlPuntero,
} from './camara'

const CONTENEDOR = { ancho: 1200, alto: 800 }
const VERTICAL = { ancho: 1080, alto: 1350 }

describe('el zoom al puntero', () => {
  it('deja quieto el punto del documento que está bajo el puntero', () => {
    const camara = { x: 120, y: -40, escala: 0.5 }
    const puntero = { x: 640, y: 300 }
    const antes = alDocumento(camara, puntero)
    const despues = zoomAlPuntero(camara, puntero, 1.7)
    expect(despues.escala).toBeCloseTo(0.85)
    const ahora = alDocumento(despues, puntero)
    expect(ahora.x).toBeCloseTo(antes.x)
    expect(ahora.y).toBeCloseTo(antes.y)
  })

  it('no pasa de los límites', () => {
    const camara = { x: 0, y: 0, escala: 1 }
    expect(zoomAlPuntero(camara, { x: 0, y: 0 }, 1000).escala).toBe(ZOOM_MAXIMO)
    expect(zoomAlPuntero(camara, { x: 0, y: 0 }, 0.0001).escala).toBe(ZOOM_MINIMO)
    expect(acotarEscala(3)).toBe(3)
  })

  it('la rueda hacia arriba agranda, hacia abajo achica, y un salto grande se acota', () => {
    expect(factorDeLaRueda(-100)).toBeGreaterThan(1)
    expect(factorDeLaRueda(100)).toBeLessThan(1)
    expect(factorDeLaRueda(0)).toBe(1)
    expect(factorDeLaRueda(5000)).toBe(factorDeLaRueda(100))
  })
})

describe('ajustar y 100 %', () => {
  it('ajustar deja el documento entero a la vista y centrado, con su margen', () => {
    const camara = escalaParaAjustar(CONTENEDOR, VERTICAL)
    // El alto manda: (800 - 96) / 1350.
    expect(camara.escala).toBeCloseTo(704 / 1350)
    expect(camara.y).toBeCloseTo(48)
    const derecha = aPantalla(camara, { x: VERTICAL.ancho, y: 0 }).x
    expect(camara.x).toBeCloseTo(CONTENEDOR.ancho - derecha)
  })

  it('ajustar agranda un documento chico', () => {
    expect(escalaParaAjustar(CONTENEDOR, { ancho: 50, alto: 50 }).escala).toBe(ZOOM_MAXIMO)
    expect(escalaParaAjustar(CONTENEDOR, { ancho: 400, alto: 200 }).escala).toBeCloseTo(2.76)
  })

  it('al 100 % la escala es 1 y el documento queda centrado', () => {
    expect(alCien(CONTENEDOR, { ancho: 1000, alto: 600 })).toEqual({ x: 100, y: 100, escala: 1 })
  })
})

describe('mover la vista', () => {
  it('desplazar corre la posición y conserva la escala', () => {
    expect(desplazar({ x: 10, y: 20, escala: 2 }, -5, 7)).toEqual({ x: 5, y: 27, escala: 2 })
  })

  it('de pantalla al documento y de vuelta', () => {
    const camara = { x: 33, y: 44, escala: 0.25 }
    const punto = { x: 400, y: 120 }
    const ida = aPantalla(camara, punto)
    expect(alDocumento(camara, ida)).toEqual(punto)
  })

  it('el texto de la píldora', () => {
    expect(textoDelZoom(0.37)).toBe('37 %')
    expect(textoDelZoom(1)).toBe('100 %')
    expect(textoDelZoom(0.5216)).toBe('52 %')
  })
})
