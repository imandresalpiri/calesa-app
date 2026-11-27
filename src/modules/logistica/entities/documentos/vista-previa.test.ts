import { describe, expect, it } from 'vitest'
import {
  extensionDelArchivo,
  formaDelArchivo,
  rutasDeLasMiniaturas,
  TOPE_DE_PESO_DE_LA_MINIATURA,
  usaMiniatura,
  vecinoDe,
} from './vista-previa'

const doc = (
  mime: string | null,
  nombre: string | null,
  bytes: number | null,
  ruta: string | null = 'u/x',
) => ({
  mime,
  nombre,
  bytes,
  ruta,
})

describe('formaDelArchivo', () => {
  it('distingue imagen, PDF y otro por el tipo de contenido', () => {
    expect(formaDelArchivo(doc('image/png', 'a.png', 1))).toBe('imagen')
    expect(formaDelArchivo(doc('image/webp', 'a.webp', 1))).toBe('imagen')
    expect(formaDelArchivo(doc('application/pdf', 'a.pdf', 1))).toBe('pdf')
    expect(formaDelArchivo(doc('application/zip', 'a.zip', 1))).toBe('otro')
  })
  it('sin tipo de contenido usa la extensión', () => {
    expect(formaDelArchivo(doc(null, 'BL.PDF', 1))).toBe('pdf')
    expect(formaDelArchivo(doc('', 'foto.JPG', 1))).toBe('imagen')
    expect(formaDelArchivo(doc(null, 'sin-extension', 1))).toBe('otro')
    expect(formaDelArchivo(doc(null, null, 1))).toBe('otro')
  })
})

describe('extensionDelArchivo', () => {
  it('toma la del nombre y, sin ella, la del tipo de contenido', () => {
    expect(extensionDelArchivo(doc('image/jpeg', 'foto.jpeg', 1))).toBe('JPEG')
    expect(extensionDelArchivo(doc('application/pdf', 'sin-punto', 1))).toBe('PDF')
    expect(extensionDelArchivo(doc(null, null, 1))).toBe('ARCHIVO')
  })
})

describe('usaMiniatura', () => {
  it('sólo una imagen con archivo y de peso conocido hasta el tope', () => {
    expect(usaMiniatura(doc('image/png', 'a.png', TOPE_DE_PESO_DE_LA_MINIATURA))).toBe(true)
    expect(usaMiniatura(doc('image/png', 'a.png', TOPE_DE_PESO_DE_LA_MINIATURA + 1))).toBe(false)
    expect(usaMiniatura(doc('image/png', 'a.png', null))).toBe(false)
    expect(usaMiniatura(doc('image/png', 'a.png', 10, null))).toBe(false)
    expect(usaMiniatura(doc('application/pdf', 'a.pdf', 10))).toBe(false)
  })
  it('rutasDeLasMiniaturas no repite ni pide lo que no es miniatura', () => {
    const lista = [
      doc('image/png', 'a.png', 10, 'u/a'),
      doc('image/png', 'b.png', 10, 'u/a'),
      doc('image/jpeg', 'c.jpg', 10, 'u/c'),
      doc('application/pdf', 'd.pdf', 10, 'u/d'),
    ]
    expect(rutasDeLasMiniaturas(lista)).toEqual(['u/a', 'u/c'])
  })
})

describe('vecinoDe', () => {
  const ids = ['a', 'b', 'c']
  it('pasa al siguiente y al anterior en el orden dado', () => {
    expect(vecinoDe(ids, 'b', 1)).toBe('c')
    expect(vecinoDe(ids, 'b', -1)).toBe('a')
  })
  it('en los extremos o sin el actual no hay vecino', () => {
    expect(vecinoDe(ids, 'c', 1)).toBeNull()
    expect(vecinoDe(ids, 'a', -1)).toBeNull()
    expect(vecinoDe(ids, 'z', 1)).toBeNull()
    expect(vecinoDe(ids, null, 1)).toBeNull()
  })
})
