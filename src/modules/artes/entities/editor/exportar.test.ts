import { describe, expect, it } from 'vitest'
import {
  ladoDeLaMiniatura,
  nombreDelArchivo,
  nombreDelPdf,
  textoDeImagenesQueFaltan,
  textoDeImagenesQueFaltanEnElPdf,
} from './exportar'

describe('exportar un arte', () => {
  it('el nombre del archivo, sin tildes ni signos', () => {
    expect(nombreDelArchivo('Promo Hilux 2021')).toBe('promo-hilux-2021.png')
    expect(nombreDelArchivo('  Ñandú · ¡Oferta!  ')).toBe('nandu-oferta.png')
    expect(nombreDelArchivo('¿?')).toBe('arte.png')
  })

  it('el PNG de una página de varias lleva su número; el PDF, su extensión', () => {
    expect(nombreDelArchivo('Ficha A4', { pagina: 2 })).toBe('ficha-a4-pagina-2.png')
    expect(nombreDelPdf('Ficha A4')).toBe('ficha-a4.pdf')
    expect(nombreDelPdf('')).toBe('arte.pdf')
  })

  it('la miniatura mide 480 px de lado mayor y no agranda', () => {
    expect(ladoDeLaMiniatura({ ancho: 1080, alto: 1920 })).toBeCloseTo(0.25)
    expect(ladoDeLaMiniatura({ ancho: 1920, alto: 1080 })).toBeCloseTo(0.25)
    expect(ladoDeLaMiniatura({ ancho: 320, alto: 400 })).toBe(1)
  })

  it('el aviso de las imágenes que no cargaron', () => {
    expect(textoDeImagenesQueFaltan(0)).toBeNull()
    expect(textoDeImagenesQueFaltan(1)).toBe('Se exportó sin 1 imagen que no cargó.')
    expect(textoDeImagenesQueFaltan(3)).toBe('Se exportó sin 3 imágenes que no cargaron.')
    expect(textoDeImagenesQueFaltanEnElPdf(0)).toBeNull()
    expect(textoDeImagenesQueFaltanEnElPdf(1)).toBe('El PDF salió sin 1 imagen que no cargó.')
    expect(textoDeImagenesQueFaltanEnElPdf(2)).toBe('El PDF salió sin 2 imágenes que no cargaron.')
  })
})
