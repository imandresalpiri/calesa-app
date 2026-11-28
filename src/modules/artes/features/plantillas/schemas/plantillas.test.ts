import { describe, expect, it } from 'vitest'
import { documentoVacio, TOPE_DEL_DOCUMENTO_EN_BYTES } from '../../../entities/documento'
import {
  esquemaCrearPlantillaDeArte,
  esquemaDuplicarEnOtroFormato,
  esquemaDuplicarPlantillaDeArte,
  esquemaGuardarPlantillaDeArte,
  esquemaPonerPorDefecto,
  esquemaVerMasPlantillas,
  esquemaVisibilidadDeLaPlantilla,
} from './plantillas'

const ID = '0b3c1f9e-8a4d-4c2b-9f1e-2d3c4b5a6978'
const ORIGEN = '1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f'
const VERSION = '2026-11-27 21:39:37.123456+00'
const MINIATURA = `miniaturas/${'a'.repeat(64)}.webp`

const crear = (cambio: Record<string, unknown> = {}) =>
  esquemaCrearPlantillaDeArte.safeParse({
    id: ID,
    nombre: 'Promo de noviembre',
    formato: 'vertical',
    origenId: ORIGEN,
    ancho: null,
    alto: null,
    ...cambio,
  })

describe('esquemaCrearPlantillaDeArte', () => {
  it('acepta un formato fijo sin medidas y recorta el nombre', () => {
    const leido = crear({ nombre: '  Promo  ' })
    expect(leido.success && leido.data.nombre).toBe('Promo')
  })

  it('pide las medidas de «Personalizado» dentro de 320 a 4096', () => {
    expect(crear({ formato: 'personalizado', ancho: 320, alto: 4096 }).success).toBe(true)
    const fuera = crear({ formato: 'personalizado', ancho: 319, alto: 1000 })
    expect(fuera.success).toBe(false)
    expect(fuera.error?.issues[0]?.message).toBe('Cada lado va de 320 a 4096 px.')
    expect(fuera.error?.issues[0]?.path).toEqual(['ancho'])
    expect(crear({ formato: 'personalizado' }).success).toBe(false)
  })

  it('rechaza un nombre vacío o de más de 80 letras, un formato que no existe y un id que no es guid', () => {
    expect(crear({ nombre: '   ' }).success).toBe(false)
    expect(crear({ nombre: 'a'.repeat(81) }).success).toBe(false)
    expect(crear({ nombre: 'ñ'.repeat(80) }).success).toBe(true)
    expect(crear({ formato: 'banner' }).success).toBe(false)
    expect(crear({ id: 'uno' }).success).toBe(false)
  })
})

describe('los demás esquemas de las plantillas de arte', () => {
  it('duplicar pide los dos ids y el nombre de la copia', () => {
    expect(
      esquemaDuplicarPlantillaDeArte.safeParse({ idNuevo: ID, fuente: ORIGEN, nombre: 'X (copia)' })
        .success,
    ).toBe(true)
    expect(
      esquemaDuplicarPlantillaDeArte.safeParse({ idNuevo: ID, fuente: 'x', nombre: 'X' }).success,
    ).toBe(false)
  })

  it('la visibilidad es privada o de la empresa, con la versión como texto', () => {
    const base = { id: ID, actualizadoEnEsperado: VERSION }
    expect(
      esquemaVisibilidadDeLaPlantilla.safeParse({ ...base, visibilidad: 'empresa' }).success,
    ).toBe(true)
    expect(
      esquemaVisibilidadDeLaPlantilla.safeParse({ ...base, visibilidad: 'publica' }).success,
    ).toBe(false)
    expect(
      esquemaVisibilidadDeLaPlantilla.safeParse({
        ...base,
        actualizadoEnEsperado: '',
        visibilidad: 'empresa',
      }).success,
    ).toBe(false)
  })

  it('por defecto acepta quitarla y «no tenía» con nulos', () => {
    expect(
      esquemaPonerPorDefecto.safeParse({
        origenId: ORIGEN,
        tipo: 'pdf',
        plantillaId: null,
        actualizadoEnEsperado: VERSION,
      }).success,
    ).toBe(true)
    expect(
      esquemaPonerPorDefecto.safeParse({
        origenId: ORIGEN,
        tipo: 'imagen',
        plantillaId: ID,
        actualizadoEnEsperado: null,
      }).success,
    ).toBe(true)
    expect(
      esquemaPonerPorDefecto.safeParse({
        origenId: ORIGEN,
        tipo: 'video',
        plantillaId: ID,
        actualizadoEnEsperado: null,
      }).success,
    ).toBe(false)
  })
})

describe('esquemaGuardarPlantillaDeArte', () => {
  const guardar = (cambio: Record<string, unknown> = {}) =>
    esquemaGuardarPlantillaDeArte.safeParse({
      id: ID,
      actualizadoEnEsperado: VERSION,
      nombre: 'Promo',
      documento: documentoVacio(),
      miniaturaRuta: MINIATURA,
      ...cambio,
    })

  it('acepta un documento válido con o sin miniatura nueva', () => {
    expect(guardar().success).toBe(true)
    expect(guardar({ miniaturaRuta: null }).success).toBe(true)
  })

  it('rechaza un documento inválido, uno de una versión más nueva y uno de más de 512 KiB', () => {
    expect(guardar({ documento: { version: 1, paginas: [] } }).success).toBe(false)
    const nuevo = guardar({ documento: { ...documentoVacio(), version: 99 } })
    expect(nuevo.error?.issues[0]?.message).toBe(
      'Esta plantilla de arte se guardó con una versión más nueva de la app. Recarga.',
    )
    const pesado = documentoVacio()
    const pagina = pesado.paginas[0]
    if (pagina) {
      pagina.fondo = { tipo: 'color', color: `#${'f'.repeat(TOPE_DEL_DOCUMENTO_EN_BYTES)}` }
    }
    expect(guardar({ documento: pesado }).success).toBe(false)
  })

  it('rechaza una miniatura fuera de la carpeta de miniaturas', () => {
    expect(guardar({ miniaturaRuta: `imagenes/${'a'.repeat(64)}.webp` }).success).toBe(false)
  })
})

describe('esquemaDuplicarEnOtroFormato', () => {
  const duplicar = (cambio: Record<string, unknown> = {}) =>
    esquemaDuplicarEnOtroFormato.safeParse({
      idNuevo: ID,
      fuente: ORIGEN,
      nombre: 'Promo (historia)',
      formato: 'historia',
      ancho: null,
      alto: null,
      documento: null,
      ...cambio,
    })

  it('acepta sin documento (la lista) y con el que se ve (el editor)', () => {
    expect(duplicar().success).toBe(true)
    expect(duplicar({ documento: documentoVacio() }).success).toBe(true)
  })

  it('rechaza un documento inválido y unas medidas fuera del rango', () => {
    expect(duplicar({ documento: { version: 2, paginas: [] } }).success).toBe(false)
    expect(duplicar({ formato: 'personalizado', ancho: 100, alto: 100 }).success).toBe(false)
    expect(duplicar({ formato: 'personalizado', ancho: 800, alto: 600 }).success).toBe(true)
  })

  it('los ids con guid', () => {
    expect(duplicar({ fuente: 'x' }).success).toBe(false)
  })
})

describe('esquemaVerMasPlantillas', () => {
  const pedido = { origenId: ORIGEN, formato: 'vertical', de: 'mias' }

  it('acepta el pedido de la pantalla con su cursor', () => {
    expect(esquemaVerMasPlantillas.safeParse({ pedido, cursor: 'abc' }).success).toBe(true)
    expect(
      esquemaVerMasPlantillas.safeParse({
        pedido: { origenId: null, formato: null, de: null },
        cursor: 'abc',
      }).success,
    ).toBe(true)
  })

  it('rechaza un filtro que no existe o un cursor vacío', () => {
    expect(
      esquemaVerMasPlantillas.safeParse({ pedido: { ...pedido, de: 'otros' }, cursor: 'abc' })
        .success,
    ).toBe(false)
    expect(esquemaVerMasPlantillas.safeParse({ pedido, cursor: '' }).success).toBe(false)
  })
})
