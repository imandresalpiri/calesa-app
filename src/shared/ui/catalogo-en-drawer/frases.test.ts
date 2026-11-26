import { describe, expect, it } from 'vitest'
import { muevelosAntes, usoDelElemento, yaNoEsta } from './frases'
import type { TextosDelCatalogo } from './tipos'

const grupos = {
  elemento: 'grupo',
  articulo: 'el',
  item: { uno: 'campo', varios: 'campos', genero: 'm' },
} as TextosDelCatalogo
const categorias = {
  elemento: 'categoría',
  articulo: 'la',
  item: { uno: 'pregunta', varios: 'preguntas', genero: 'f' },
} as TextosDelCatalogo

describe('las frases del catálogo', () => {
  it('dicen el uso en su número', () => {
    expect(usoDelElemento(0, grupos)).toBe('Sin campos')
    expect(usoDelElemento(1, categorias)).toBe('1 pregunta')
    expect(usoDelElemento(3, grupos)).toBe('3 campos')
  })

  it('concuerdan el pedido de mover con los ítems y el elemento', () => {
    expect(muevelosAntes(3, grupos)).toBe('Muévelos antes de quitarlo.')
    expect(muevelosAntes(1, grupos)).toBe('Muévelo antes de quitarlo.')
    expect(muevelosAntes(2, categorias)).toBe('Muévelas antes de quitarla.')
  })

  it('nombran al que ya no está con su demostrativo', () => {
    expect(yaNoEsta(grupos)).toBe('Ese grupo ya no existe: recarga.')
    expect(yaNoEsta(categorias)).toBe('Esa categoría ya no existe: recarga.')
  })
})
