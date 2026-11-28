import { describe, expect, it } from 'vitest'
import { MAXIMO_DE_FOTOS_DEL_VEHICULO } from '../capas-del-documento'
import { fotosEnOrden } from './fotos-en-orden'

const foto = (id: string, orden: number, esPortada = false) => ({ id, orden, esPortada })

describe('las fotos como las numera un arte', () => {
  it('la portada primero y luego el orden de la galería', () => {
    const ordenadas = fotosEnOrden([foto('c', 3), foto('a', 1), foto('p', 2, true), foto('b', 0)])
    expect(ordenadas.map((f) => f.id)).toEqual(['p', 'b', 'a', 'c'])
  })

  it('no cambia la lista que recibe', () => {
    const fotos = [foto('b', 1), foto('a', 0)]
    fotosEnOrden(fotos)
    expect(fotos.map((f) => f.id)).toEqual(['b', 'a'])
  })

  it(`hasta ${String(MAXIMO_DE_FOTOS_DEL_VEHICULO)}: la 21.ª en adelante no se ofrece`, () => {
    const veinticuatro = Array.from({ length: 24 }, (_, i) => foto(`f${String(i)}`, i))
    const ordenadas = fotosEnOrden(veinticuatro)
    expect(ordenadas).toHaveLength(MAXIMO_DE_FOTOS_DEL_VEHICULO)
    expect(ordenadas.at(-1)?.id).toBe('f19')
  })

  it('una portada al final de la galería entra igual, primera', () => {
    const fotos = [
      ...Array.from({ length: 22 }, (_, i) => foto(`f${String(i)}`, i)),
      foto('p', 22, true),
    ]
    expect(fotosEnOrden(fotos)[0]?.id).toBe('p')
  })
})
