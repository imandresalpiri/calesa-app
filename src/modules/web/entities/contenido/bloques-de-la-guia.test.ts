import { describe, expect, it } from 'vitest'
import { BLOQUES_DE_LA_GUIA, destinoAlMover, filtrarBloques } from './bloques-de-la-guia'

describe('filtrarBloques', () => {
  it('sin nada escrito ofrece todos, en el orden del catálogo', () => {
    expect(filtrarBloques('').map((b) => b.clave)).toEqual(BLOQUES_DE_LA_GUIA.map((b) => b.clave))
    expect(filtrarBloques('  ')).toHaveLength(BLOQUES_DE_LA_GUIA.length)
  })

  it('encuentra por nombre y por palabra, sin tildes ni mayúsculas', () => {
    expect(filtrarBloques('galeria').map((b) => b.clave)).toEqual(['galeria'])
    expect(filtrarBloques('VIDEO').map((b) => b.clave)).toEqual(['video'])
    expect(filtrarBloques('youtube').map((b) => b.clave)).toEqual(['video'])
    expect(filtrarBloques('parrafo').map((b) => b.clave)).toEqual(['parrafo'])
  })

  it('devuelve la lista vacía si nada coincide', () => {
    expect(filtrarBloques('zzz')).toEqual([])
  })
})

describe('destinoAlMover', () => {
  it('sube y baja una posición', () => {
    expect(destinoAlMover(4, 2, 'subir')).toBe(1)
    expect(destinoAlMover(4, 2, 'bajar')).toBe(3)
  })

  it('no sale de los bordes', () => {
    expect(destinoAlMover(4, 0, 'subir')).toBeNull()
    expect(destinoAlMover(4, 3, 'bajar')).toBeNull()
    expect(destinoAlMover(1, 0, 'bajar')).toBeNull()
    expect(destinoAlMover(4, 9, 'subir')).toBeNull()
  })
})
