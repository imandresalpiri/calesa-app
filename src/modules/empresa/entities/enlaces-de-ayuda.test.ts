import { describe, expect, it } from 'vitest'
import {
  alTopeDeLaEmpresa,
  camposCambiados,
  dominioDe,
  esquemaDeCamposDeEnlace,
  esUrlDeAyuda,
  largoDe,
  listaDeLaEmpresaDesde,
  MENSAJE_DE_URL,
  MENSAJE_DESCRIPCION_LARGA,
  MENSAJE_SIN_TITULO,
  MENSAJE_TITULO_LARGO,
  puedeMoverse,
  respuestaDeEnlacesDesde,
  revisarCamposDeEnlace,
  TOPE_DE_ENLACES_DE_LA_EMPRESA,
  TOPE_DE_ENLACES_PROPIOS,
  textoDelLugar,
  textoDelTopeDeLaEmpresa,
} from './enlaces-de-ayuda'

const ID = '00000000-0000-4000-8000-000000000001'

describe('los topes', () => {
  it('son los de la base: 30 de la empresa y 20 propios', () => {
    expect(TOPE_DE_ENLACES_DE_LA_EMPRESA).toBe(30)
    expect(TOPE_DE_ENLACES_PROPIOS).toBe(20)
  })
})

describe('esUrlDeAyuda', () => {
  it('pide https:// y un dominio, como el regex de la base', () => {
    expect(esUrlDeAyuda('https://ayuda.ejemplo.com')).toBe(true)
    expect(esUrlDeAyuda('HTTPS://Ayuda.com/a?b=1#c')).toBe(true)
    expect(esUrlDeAyuda('http://ayuda.ejemplo.com')).toBe(false)
    expect(esUrlDeAyuda('https://')).toBe(false)
    expect(esUrlDeAyuda('https:ayuda.com')).toBe(false)
    expect(esUrlDeAyuda('https://ayuda ejemplo.com')).toBe(false)
    expect(esUrlDeAyuda(`https://a.com/${'x'.repeat(2000)}`)).toBe(false)
  })
})

describe('largoDe', () => {
  it('cuenta puntos de código como char_length', () => {
    expect(largoDe('😀😀')).toBe(2)
    expect(largoDe('ñá')).toBe(2)
  })
})

describe('dominioDe', () => {
  it('da el dominio, o la dirección si no se entiende', () => {
    expect(dominioDe('https://ayuda.ejemplo.com/manual?x=1')).toBe('ayuda.ejemplo.com')
    expect(dominioDe('no es una dirección')).toBe('no es una dirección')
  })
})

describe('esquemaDeCamposDeEnlace', () => {
  it('recorta y deja la descripción vacía en nulo', () => {
    expect(
      esquemaDeCamposDeEnlace.parse({
        titulo: '  Manual  ',
        url: ' https://a.com ',
        descripcion: '   ',
      }),
    ).toEqual({ titulo: 'Manual', url: 'https://a.com', descripcion: null })
    expect(
      esquemaDeCamposDeEnlace.parse({ titulo: 'M', url: 'https://a.com', descripcion: null }),
    ).toEqual({
      titulo: 'M',
      url: 'https://a.com',
      descripcion: null,
    })
  })

  it('acepta 80 y 140 caracteres y rechaza uno más', () => {
    expect(
      esquemaDeCamposDeEnlace.safeParse({
        titulo: 'á'.repeat(80),
        url: 'https://a.com',
        descripcion: 'b'.repeat(140),
      }).success,
    ).toBe(true)
    expect(
      esquemaDeCamposDeEnlace.safeParse({
        titulo: 'á'.repeat(81),
        url: 'https://a.com',
        descripcion: null,
      }).success,
    ).toBe(false)
    expect(
      esquemaDeCamposDeEnlace.safeParse({
        titulo: 'a',
        url: 'https://a.com',
        descripcion: 'b'.repeat(141),
      }).success,
    ).toBe(false)
  })

  it('rechaza una dirección sin https://', () => {
    for (const url of ['http://a.com', 'https:a.com', 'a.com', 'ftp://a.com', '']) {
      expect(
        esquemaDeCamposDeEnlace.safeParse({ titulo: 'a', url, descripcion: null }).success,
      ).toBe(false)
    }
  })
})

describe('revisarCamposDeEnlace', () => {
  it('dice el motivo de cada campo', () => {
    expect(
      revisarCamposDeEnlace({ titulo: ' ', url: 'http://a.com', descripcion: 'x'.repeat(141) }),
    ).toEqual({
      ok: false,
      motivos: {
        titulo: MENSAJE_SIN_TITULO,
        url: MENSAJE_DE_URL,
        descripcion: MENSAJE_DESCRIPCION_LARGA,
      },
    })
    expect(
      revisarCamposDeEnlace({ titulo: 'a'.repeat(81), url: 'https://a.com', descripcion: '' }),
    ).toEqual({
      ok: false,
      motivos: { titulo: MENSAJE_TITULO_LARGO },
    })
  })

  it('devuelve los campos listos', () => {
    expect(
      revisarCamposDeEnlace({ titulo: 'Manual', url: 'https://a.com', descripcion: '' }),
    ).toEqual({
      ok: true,
      campos: { titulo: 'Manual', url: 'https://a.com', descripcion: null },
    })
  })
})

describe('camposCambiados', () => {
  const original = { titulo: 'Manual', url: 'https://a.com', descripcion: null }

  it('compara recortado contra lo guardado', () => {
    expect(
      camposCambiados({ titulo: ' Manual ', url: 'https://a.com', descripcion: ' ' }, original),
    ).toBe(false)
    expect(
      camposCambiados({ titulo: 'Manual 2', url: 'https://a.com', descripcion: '' }, original),
    ).toBe(true)
    expect(
      camposCambiados({ titulo: 'Manual', url: 'https://a.com', descripcion: 'Algo' }, original),
    ).toBe(true)
  })

  it('en uno nuevo, cualquier cosa escrita cuenta', () => {
    expect(camposCambiados({ titulo: '', url: '', descripcion: '' }, null)).toBe(false)
    expect(camposCambiados({ titulo: '', url: 'h', descripcion: '' }, null)).toBe(true)
  })
})

describe('listaDeLaEmpresaDesde y respuestaDeEnlacesDesde', () => {
  const fila = {
    id: ID,
    titulo: 'Manual',
    url: 'https://a.com',
    descripcion: null,
    orden: 1,
    activo: true,
    actualizado_en: '2026-11-26T10:00:00.123456+00:00',
  }

  it('leen la lista de la base', () => {
    const esperada = {
      tope: 30,
      enlaces: [
        {
          id: ID,
          titulo: 'Manual',
          url: 'https://a.com',
          descripcion: null,
          orden: 1,
          activo: true,
          actualizadoEn: '2026-11-26T10:00:00.123456+00:00',
        },
      ],
    }
    expect(listaDeLaEmpresaDesde({ tope: 30, enlaces: [fila] })).toEqual(esperada)
    expect(respuestaDeEnlacesDesde({ id: ID, lista: { tope: 30, enlaces: [fila] } })).toEqual(
      esperada,
    )
  })

  it('dan nulo con otra forma', () => {
    expect(listaDeLaEmpresaDesde({ tope: 30 })).toBeNull()
    expect(respuestaDeEnlacesDesde(null)).toBeNull()
    expect(respuestaDeEnlacesDesde({ id: ID })).toBeNull()
  })
})

describe('el tope y el orden de la empresa', () => {
  const enlaces = [
    { id: 'a', titulo: 'Uno' },
    { id: 'b', titulo: 'Dos' },
    { id: 'c', titulo: 'Tres' },
  ]

  it('alTopeDeLaEmpresa y su texto', () => {
    expect(alTopeDeLaEmpresa({ tope: 2, enlaces: [] })).toBe(false)
    expect(textoDelTopeDeLaEmpresa(30)).toBe(
      'La empresa ya tiene 30 enlaces de ayuda: quita uno para sumar otro.',
    )
  })

  it('puedeMoverse mira los extremos', () => {
    expect(puedeMoverse(enlaces, 'a', 'subir')).toBe(false)
    expect(puedeMoverse(enlaces, 'a', 'bajar')).toBe(true)
    expect(puedeMoverse(enlaces, 'c', 'bajar')).toBe(false)
    expect(puedeMoverse(enlaces, 'x', 'subir')).toBe(false)
  })

  it('textoDelLugar dice dónde quedó', () => {
    expect(textoDelLugar(enlaces, 'b')).toBe('Dos, 2 de 3')
    expect(textoDelLugar(enlaces, 'x')).toBe('')
  })
})
