import { describe, expect, it } from 'vitest'
import { rect } from './capas-de-prueba.soporte'
import { escribirPortapapeles, leerPortapapeles } from './portapapeles'

describe('el portapapeles', () => {
  it('lo escrito se vuelve a leer igual', () => {
    const portapapeles = {
      capas: [rect('a', 'g'), rect('b', 'g')],
      grupos: [{ id: 'g', nombre: 'Grupo 1', oculto: false, bloqueado: false }],
    }
    expect(leerPortapapeles(escribirPortapapeles(portapapeles))).toEqual(portapapeles)
  })

  it('nada, un JSON roto, vacío o de otra forma es no haber copiado', () => {
    expect(leerPortapapeles(null)).toBeNull()
    expect(leerPortapapeles('{')).toBeNull()
    expect(leerPortapapeles(JSON.stringify({ capas: [], grupos: [] }))).toBeNull()
    expect(leerPortapapeles(JSON.stringify({ capas: [{ tipo: 'otra' }], grupos: [] }))).toBeNull()
  })
})
