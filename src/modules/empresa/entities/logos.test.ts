import { describe, expect, it } from 'vitest'
import {
  alTopeDeLogos,
  claveDelNombreDeLogo,
  conArchivo,
  idsConElMovido,
  idsMoviendoUnLugar,
  listaDeLogosDesde,
  motivoDelNombreDeLogo,
  nombreSugerido,
  nombresSugeridos,
  puedeMoverse,
  respuestaDeLogosDesde,
  textoDeUsos,
  textoDelLugarDeLogo,
  type ListaDeLogos,
  type VarianteDelLogo,
} from './logos'

const fija = (id: 'principal' | 'oscuro', ruta: string | null): VarianteDelLogo => ({
  id,
  nombre: id === 'principal' ? 'Principal' : 'Para fondo oscuro',
  ruta,
  tipo: ruta ? 'png' : null,
  ancho: null,
  alto: null,
  actualizadoEn: null,
  uso: id,
})
const propia = (id: string, nombre: string): VarianteDelLogo => ({
  id,
  nombre,
  ruta: `logos/${id}.png`,
  tipo: 'png',
  ancho: 10,
  alto: 10,
  actualizadoEn: '2026-11-27T10:00:00Z',
  uso: null,
})
const lista = (...propias: VarianteDelLogo[]): ListaDeLogos => ({
  tope: 12,
  variantes: [fija('principal', 'logos/a.png'), fija('oscuro', null), ...propias],
})

describe('claveDelNombreDeLogo', () => {
  it('no distingue mayúsculas, tildes ni espacios', () => {
    expect(claveDelNombreDeLogo(' Para  Fondo Óscuro ')).toBe('parafondooscuro')
    expect(claveDelNombreDeLogo('ÍCONO')).toBe(claveDelNombreDeLogo('icono'))
    expect(claveDelNombreDeLogo('Para\u00a0Sol')).toBe('parasol')
  })
})

describe('motivoDelNombreDeLogo', () => {
  const l = lista(propia('a', 'Monocromo'))
  it('pide un nombre', () => {
    expect(motivoDelNombreDeLogo('   ', l)).toBe('Escribe un nombre.')
  })
  it('tope de 40 caracteres', () => {
    expect(motivoDelNombreDeLogo('a'.repeat(40), l)).toBeNull()
    expect(motivoDelNombreDeLogo('a'.repeat(41), l)).toMatch(/hasta 40/)
  })
  it('rechaza uno repetido, también el de las fijas', () => {
    expect(motivoDelNombreDeLogo('MONOCRÓMO', l)).toBe('Ya existe «MONOCRÓMO».')
    expect(motivoDelNombreDeLogo('para fondo oscuro', l)).toBe('Ya existe «para fondo oscuro».')
    expect(motivoDelNombreDeLogo('principal', l)).not.toBeNull()
  })
  it('al renombrar, su propio nombre no cuenta', () => {
    expect(motivoDelNombreDeLogo('monocromo', l, 'a')).toBeNull()
  })
})

describe('nombres sugeridos', () => {
  it('sólo los que faltan', () => {
    expect(nombresSugeridos(lista())).toEqual(['Ícono', 'Monocromo'])
    expect(nombresSugeridos(lista(propia('a', 'icono')))).toEqual(['Monocromo'])
    expect(nombreSugerido(lista(propia('a', 'icono'), propia('b', 'monocromo')))).toBe('')
  })
})

describe('tope y archivos', () => {
  it('el tope cuenta sólo las propias', () => {
    expect(alTopeDeLogos(lista())).toBe(false)
    const doce = Array.from({ length: 12 }, (_, i) => propia(String(i), `V${String(i)}`))
    expect(alTopeDeLogos(lista(...doce))).toBe(true)
  })
  it('conArchivo deja afuera la fija sin logo', () => {
    expect(conArchivo(lista(propia('a', 'X'))).map((v) => v.id)).toEqual(['principal', 'a'])
  })
})

describe('orden', () => {
  const l = lista(propia('a', 'A'), propia('b', 'B'), propia('c', 'C'))
  it('mueve un lugar y a una posición', () => {
    expect(idsMoviendoUnLugar(l, 'b', 'antes')).toEqual(['b', 'a', 'c'])
    expect(idsMoviendoUnLugar(l, 'b', 'despues')).toEqual(['a', 'c', 'b'])
    expect(idsConElMovido(l, 'a', 2)).toEqual(['b', 'c', 'a'])
    expect(idsConElMovido(l, 'c', 99)).toEqual(['a', 'b', 'c'])
  })
  it('en los extremos no se mueve', () => {
    expect(puedeMoverse(l, 'a', 'antes')).toBe(false)
    expect(puedeMoverse(l, 'c', 'despues')).toBe(false)
    expect(puedeMoverse(l, 'b', 'antes')).toBe(true)
    expect(puedeMoverse(l, 'principal', 'despues')).toBe(false)
  })
  it('dice dónde quedó', () => {
    expect(textoDelLugarDeLogo(l, 'b')).toBe('B, 2 de 3')
  })
})

describe('textoDeUsos', () => {
  it('nada si no se usa', () => {
    expect(textoDeUsos({ ventanasDeCamara: 0 })).toBeNull()
  })
  it('singular, plural y tope', () => {
    expect(textoDeUsos({ ventanasDeCamara: 1 })).toBe('La usa la ventana de cámara de 1 persona.')
    expect(textoDeUsos({ ventanasDeCamara: 2 })).toBe('La usa la ventana de cámara de 2 personas.')
    expect(textoDeUsos({ ventanasDeCamara: 101 })).toBe(
      'La usa la ventana de cámara de 100+ personas.',
    )
  })
})

describe('lectura de la base', () => {
  const cruda = {
    tope: 12,
    variantes: [
      {
        id: 'principal',
        nombre: 'Principal',
        ruta: 'logos/a.png',
        tipo: 'png',
        ancho: null,
        alto: null,
        actualizado_en: null,
        uso: 'principal',
      },
      {
        id: 'oscuro',
        nombre: 'Para fondo oscuro',
        ruta: null,
        tipo: null,
        ancho: null,
        alto: null,
        actualizado_en: null,
        uso: 'oscuro',
      },
      {
        id: 'x',
        nombre: 'Ícono',
        ruta: 'logos/x.svg',
        tipo: 'svg',
        ancho: 5,
        alto: 6,
        actualizado_en: '2026-11-27T10:00:00Z',
        uso: null,
      },
    ],
  }
  it('la lista y la respuesta de una escritura', () => {
    expect(listaDeLogosDesde(cruda)?.variantes[2]).toMatchObject({
      id: 'x',
      actualizadoEn: '2026-11-27T10:00:00Z',
      tipo: 'svg',
    })
    expect(respuestaDeLogosDesde({ lista: cruda, ruta: 'logos/x.svg' })?.ruta).toBe('logos/x.svg')
    expect(respuestaDeLogosDesde({ lista: cruda })?.ruta).toBeNull()
  })
  it('una forma que no es, nula', () => {
    expect(listaDeLogosDesde({ tope: 1 })).toBeNull()
    expect(respuestaDeLogosDesde({})).toBeNull()
  })
})
