import { describe, expect, it } from 'vitest'
import { capaDeTexto } from '../datos/datos-de-prueba.soporte'
import { rect } from './capas-de-prueba.soporte'
import { contornoQueSeDibuja, efectosDelFormato, sombraQueSeDibuja } from './efectos-del-formato'

const SOMBRA = { color: '#000000', desenfoque: 4, x: 1, y: 1 }

describe('los efectos de cada formato', () => {
  it('un PDF no ofrece sombra ni contorno del texto; una imagen, sí', () => {
    expect(efectosDelFormato('pdf')).toEqual({ sombra: false, contornoDelTexto: false })
    expect(efectosDelFormato('imagen')).toEqual({ sombra: true, contornoDelTexto: true })
  })

  it('una capa vieja con sombra se dibuja sin ella en un PDF', () => {
    const capa = { ...rect('a'), sombra: SOMBRA }
    expect(sombraQueSeDibuja(capa, 'pdf')).toBeNull()
    expect(sombraQueSeDibuja(capa, 'imagen')).toEqual(SOMBRA)
  })

  it('el contorno de un texto sólo en un formato de imagen y con grosor', () => {
    const texto = { ...capaDeTexto('t', 'Hola'), borde: '#ff0000', grosor: 2 }
    expect(contornoQueSeDibuja(texto, 'pdf')).toBeNull()
    expect(contornoQueSeDibuja(texto, 'imagen')).toEqual({ color: '#ff0000', grosor: 2 })
    expect(contornoQueSeDibuja({ ...texto, grosor: 0 }, 'imagen')).toBeNull()
  })
})
