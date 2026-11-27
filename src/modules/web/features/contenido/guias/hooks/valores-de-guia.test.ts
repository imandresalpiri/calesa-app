import { describe, expect, it } from 'vitest'
import { hayCambiosEnLaGuia, type ValoresDeGuia } from './valores-de-guia'

const parrafo = (texto: string) => ({
  type: 'paragraph' as const,
  content: texto === '' ? [] : [{ type: 'text' as const, text: texto }],
})

const base: ValoresDeGuia = {
  titulo: 'Guía',
  slug: 'guia',
  resumen: '',
  categoriaId: '',
  autorId: '',
  portadaRuta: '',
  seoTitulo: '',
  seoDescripcion: '',
  cuerpo: { type: 'doc', content: [parrafo('Hola')] },
}

describe('hayCambiosEnLaGuia', () => {
  it('lo igual no es un cambio, ni con el párrafo vacío que el editor deja al final', () => {
    expect(hayCambiosEnLaGuia(base, base)).toBe(false)
    expect(
      hayCambiosEnLaGuia(
        { ...base, cuerpo: { type: 'doc', content: [parrafo('Hola'), parrafo('')] } },
        base,
      ),
    ).toBe(false)
  })

  it('un campo o un texto distinto sí lo es', () => {
    expect(hayCambiosEnLaGuia({ ...base, titulo: 'Otra' }, base)).toBe(true)
    expect(
      hayCambiosEnLaGuia({ ...base, cuerpo: { type: 'doc', content: [parrafo('Hola!')] } }, base),
    ).toBe(true)
    expect(hayCambiosEnLaGuia({ ...base, cuerpo: null }, base)).toBe(true)
  })

  it('un párrafo vacío en medio sí cuenta', () => {
    expect(
      hayCambiosEnLaGuia(
        { ...base, cuerpo: { type: 'doc', content: [parrafo(''), parrafo('Hola')] } },
        base,
      ),
    ).toBe(true)
  })
})
