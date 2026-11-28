import { describe, expect, it } from 'vitest'
import { FOTOS_DE_EJEMPLO, TARJETA_DE_EJEMPLO } from '../editor/datos-de-ejemplo'
import { rutaDeLaFotoDelLienzo, rutaDeLaImagenDelLienzo, rutaDelLogoDelLienzo } from '../medios'
import { deDondeSaleLaImagen } from './imagen-del-pdf'

const V = '11111111-1111-4111-8111-111111111111'
const F = '22222222-2222-4222-8222-222222222222'
const C = '33333333-3333-4333-8333-333333333333'

describe('deDondeSaleLaImagen', () => {
  it('lee al revés cada ruta del lienzo', () => {
    expect(deDondeSaleLaImagen(rutaDeLaImagenDelLienzo(V))).toEqual({ tipo: 'biblioteca', id: V })
    expect(deDondeSaleLaImagen(rutaDelLogoDelLienzo('oscuro'))).toEqual({
      tipo: 'logo',
      variante: 'oscuro',
    })
    expect(deDondeSaleLaImagen(rutaDelLogoDelLienzo(V))).toEqual({ tipo: 'logo', variante: V })
    expect(deDondeSaleLaImagen(rutaDeLaFotoDelLienzo(V, F, 1600))).toEqual({
      tipo: 'foto',
      vehiculoId: V,
      fotoId: F,
      lado: 1600,
    })
    expect(deDondeSaleLaImagen(`/cotizaciones/${C}/imagen`)).toEqual({
      tipo: 'tarjeta',
      cotizacionId: C,
      sinMoneda: false,
    })
    expect(deDondeSaleLaImagen(`/cotizaciones/${C}/imagen?sin-moneda=1`)).toEqual({
      tipo: 'tarjeta',
      cotizacionId: C,
      sinMoneda: true,
    })
    for (const { src } of [...FOTOS_DE_EJEMPLO, TARJETA_DE_EJEMPLO]) {
      expect(deDondeSaleLaImagen(src)).toEqual({ tipo: 'ejemplo', archivo: src.split('/').pop() })
    }
  })

  it('no lee otra cosa: otro origen, ids que no son guid, otro ancho, un archivo fuera de la carpeta', () => {
    for (const src of [
      'https://ejemplo.com/a.png',
      '/artes/imagenes/no-es-un-id',
      '/artes/imagenes/%E0%A4%A',
      '/artes/logos/claro',
      `/artes/fotos/${V}/${F}?ancho=900`,
      `/artes/fotos/${V}/${F}`,
      `/cotizaciones/${C}/imagen?ancho=480`,
      '/cotizaciones/no-es-un-id/imagen',
      '/artes/ejemplo/../secreto.svg',
      '/artes/ejemplo/foto.png',
    ]) {
      expect(deDondeSaleLaImagen(src)).toBeNull()
    }
  })
})
