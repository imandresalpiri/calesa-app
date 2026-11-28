import { describe, expect, it } from 'vitest'
import {
  capaDeFoto,
  capaDeImagen,
  capaDeLogo,
  capaDeTarjeta,
  COTIZACION_ID,
  datosReales,
  FOTO_1,
  IMAGEN_ID,
  VEHICULO_ID,
} from '../datos/datos-de-prueba.soporte'
import type { LogoDelEditor } from '../tipos'
import { FOTOS_DE_EJEMPLO, TARJETA_DE_EJEMPLO } from './datos-de-ejemplo'
import { esDelMismoOrigen, fuenteDeLaCapa, type ConQueSeDibuja } from './fuente-de-la-capa'

const LOGOS: readonly LogoDelEditor[] = [
  { id: 'principal', nombre: 'Principal', ancho: null, alto: null },
  { id: '7c0e6a1e-2f9b-4c1d-9a51-111111111111', nombre: 'Blanco', ancho: 400, alto: 120 },
]
const VARIANTE = '7c0e6a1e-2f9b-4c1d-9a51-111111111111'

function con(cambios: Partial<ConQueSeDibuja> = {}): ConQueSeDibuja {
  return { logos: LOGOS, datos: datosReales(), sinMoneda: false, ...cambios }
}
const deEjemplo = con({ datos: datosReales({ deEjemplo: true }) })

describe('la biblioteca y el logo', () => {
  it('la biblioteca por su ruta, sin medidas', () => {
    expect(fuenteDeLaCapa(capaDeImagen('i'), con())).toEqual({
      src: `/artes/imagenes/${IMAGEN_ID}`,
      medidas: null,
    })
  })

  it('el logo por su variante, con las medidas de su fila', () => {
    expect(fuenteDeLaCapa(capaDeLogo('l', VARIANTE), con())).toEqual({
      src: `/artes/logos/${VARIANTE}`,
      medidas: { ancho: 400, alto: 120 },
    })
  })

  it('el logo sin variante es el principal, y uno sin medidas no las tiene', () => {
    expect(fuenteDeLaCapa(capaDeLogo('l', null), con())).toEqual({
      src: '/artes/logos/principal',
      medidas: null,
    })
  })

  it('una variante que la empresa no tiene no se dibuja', () => {
    expect(fuenteDeLaCapa(capaDeLogo('l', 'oscuro'), con())).toBeNull()
    expect(fuenteDeLaCapa(capaDeLogo('l', null), con({ logos: [] }))).toBeNull()
  })
})

describe('la foto del vehículo', () => {
  it('la foto N del vehículo elegido, por su ruta de 1600 px y con sus medidas', () => {
    expect(fuenteDeLaCapa(capaDeFoto('f', 0), con())).toEqual({
      src: `/artes/fotos/${VEHICULO_ID}/${FOTO_1}?ancho=1600`,
      medidas: { ancho: 1600, alto: 1200 },
    })
  })

  it('la que el vehículo no tiene, o sin vehículo, no se dibuja', () => {
    expect(fuenteDeLaCapa(capaDeFoto('f', 5), con())).toBeNull()
    expect(
      fuenteDeLaCapa(capaDeFoto('f', 0), con({ datos: datosReales({ vehiculo: null }) })),
    ).toBeNull()
  })

  it('con los datos de ejemplo, las de ejemplo, que dan la vuelta', () => {
    const tercera = FOTOS_DE_EJEMPLO[2]
    const primera = FOTOS_DE_EJEMPLO[0]
    expect(fuenteDeLaCapa(capaDeFoto('f', 2), deEjemplo)?.src).toBe(tercera?.src)
    expect(fuenteDeLaCapa(capaDeFoto('f', 3), deEjemplo)).toEqual({
      src: primera?.src,
      medidas: { ancho: primera?.ancho, alto: primera?.alto },
    })
  })
})

describe('la tarjeta de la cotización', () => {
  it('la de la cotización elegida, y sin la moneda con el Modo Live', () => {
    expect(fuenteDeLaCapa(capaDeTarjeta('t'), con())).toEqual({
      src: `/cotizaciones/${COTIZACION_ID}/imagen`,
      medidas: null,
    })
    expect(fuenteDeLaCapa(capaDeTarjeta('t'), con({ sinMoneda: true }))).toEqual({
      src: `/cotizaciones/${COTIZACION_ID}/imagen?sin-moneda=1`,
      medidas: null,
    })
  })

  it('sin cotización no se dibuja', () => {
    expect(
      fuenteDeLaCapa(capaDeTarjeta('t'), con({ datos: datosReales({ cotizacion: null }) })),
    ).toBeNull()
  })

  it('con los datos de ejemplo, la de ejemplo con sus medidas', () => {
    expect(fuenteDeLaCapa(capaDeTarjeta('t'), deEjemplo)).toEqual({
      src: TARJETA_DE_EJEMPLO.src,
      medidas: { ancho: TARJETA_DE_EJEMPLO.ancho, alto: TARJETA_DE_EJEMPLO.alto },
    })
  })

  it('una ruta que no es del mismo origen no se dibuja', () => {
    const datos = datosReales()
    if (!datos.cotizacion) {
      throw new Error('falta la cotización')
    }
    const deAfuera = {
      ...datos,
      cotizacion: {
        ...datos.cotizacion,
        imagen: { src: 'https://ejemplo.supabase.co/x.png', srcSinMoneda: '/otra' },
      },
    }
    expect(fuenteDeLaCapa(capaDeTarjeta('t'), con({ datos: deAfuera }))).toBeNull()
  })
})

describe('qué es del mismo origen', () => {
  it('las rutas propias por id y los SVG de ejemplo', () => {
    for (const src of [
      `/artes/imagenes/${IMAGEN_ID}`,
      '/artes/logos/principal',
      `/artes/fotos/${VEHICULO_ID}/${FOTO_1}?ancho=480`,
      `/artes/fotos/${VEHICULO_ID}/${FOTO_1}?ancho=1600`,
      `/cotizaciones/${COTIZACION_ID}/imagen`,
      `/cotizaciones/${COTIZACION_ID}/imagen?sin-moneda=1`,
      '/artes/ejemplo/foto-1.svg',
    ]) {
      expect(esDelMismoOrigen(src), src).toBe(true)
    }
  })

  it('nunca una URL de otro origen ni una ruta parecida', () => {
    for (const src of [
      'https://ejemplo.supabase.co/storage/v1/object/sign/artes/imagenes/x.webp',
      '//ejemplo.supabase.co/artes/imagenes/x',
      `/artes/fotos/${VEHICULO_ID}/${FOTO_1}?ancho=4000`,
      `/artes/fotos/${VEHICULO_ID}/${FOTO_1}`,
      `/cotizaciones/${COTIZACION_ID}/imagen?moneda=0`,
      '/artes/ejemplo/foto.png',
      '/artes/imagenes/../../secreto',
      'data:image/png;base64,AAAA',
    ]) {
      expect(esDelMismoOrigen(src), src).toBe(false)
    }
  })
})
