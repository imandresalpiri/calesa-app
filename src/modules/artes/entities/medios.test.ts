import { describe, expect, it } from 'vitest'
import {
  cabecerasDelMedio,
  CSP_DEL_SVG,
  esquemaDeLaVarianteDelLogo,
  etiquetaDeLaRuta,
  rutaDeLaImagenDelLienzo,
  rutaDelLogoDelLienzo,
} from './medios'

describe('medios del lienzo', () => {
  it('las rutas del mismo origen', () => {
    expect(rutaDeLaImagenDelLienzo('6f1b6c1e-2c1d-4a8e-9a55-0f6a3b7b2d11')).toBe(
      '/artes/imagenes/6f1b6c1e-2c1d-4a8e-9a55-0f6a3b7b2d11',
    )
    expect(rutaDelLogoDelLienzo(null)).toBe('/artes/logos/principal')
    expect(rutaDelLogoDelLienzo('oscuro')).toBe('/artes/logos/oscuro')
  })

  it('la variante del logo: las fijas o un guid', () => {
    expect(esquemaDeLaVarianteDelLogo.safeParse('principal').success).toBe(true)
    expect(esquemaDeLaVarianteDelLogo.safeParse('oscuro').success).toBe(true)
    expect(
      esquemaDeLaVarianteDelLogo.safeParse('6f1b6c1e-2c1d-4a8e-9a55-0f6a3b7b2d11').success,
    ).toBe(true)
    expect(esquemaDeLaVarianteDelLogo.safeParse('../x').success).toBe(false)
  })

  it('la etiqueta va entre comillas y sin lo que no admite', () => {
    expect(etiquetaDeLaRuta('imagenes/ab12.webp')).toBe('"imagenes/ab12.webp"')
    expect(etiquetaDeLaRuta('a"b c')).toBe('"a_b_c"')
  })

  it('la biblioteca es inmutable; el logo pregunta; el SVG lleva su CSP', () => {
    const imagen = cabecerasDelMedio({ extension: 'webp', etiqueta: '"x"', inmutable: true })
    expect(imagen['Cache-Control']).toBe('private, max-age=86400, immutable')
    expect(imagen['Content-Type']).toBe('image/webp')
    expect(imagen['X-Content-Type-Options']).toBe('nosniff')
    expect(imagen['Content-Security-Policy']).toBeUndefined()
    const logo = cabecerasDelMedio({ extension: 'svg', etiqueta: '"x"', inmutable: false })
    expect(logo['Cache-Control']).toBe('private, no-cache')
    expect(logo['Content-Security-Policy']).toBe(CSP_DEL_SVG)
  })
})
