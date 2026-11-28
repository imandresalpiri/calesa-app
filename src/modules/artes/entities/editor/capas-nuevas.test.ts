import { describe, expect, it } from 'vitest'
import { esquemaDeCapa } from '../documento'
import { nuevaCapa, nombreVisible, tamanoDelTextoNuevo, type QueSeAgrega } from './capas-nuevas'

const cuadrado = { ancho: 1080, alto: 1080 }
const a4 = { ancho: 595, alto: 842 }
const GUID = '6f1b6c1e-2c1d-4a8e-9a55-0f6a3b7b2d11'

const TODAS: QueSeAgrega[] = [
  { tipo: 'texto' },
  { tipo: 'forma', forma: 'rectangulo' },
  { tipo: 'forma', forma: 'elipse' },
  { tipo: 'forma', forma: 'poligono' },
  { tipo: 'linea' },
  { tipo: 'imagen', imagenId: GUID, proporcion: 2 },
  { tipo: 'logo', varianteId: null, proporcion: 0.5 },
  { tipo: 'foto', indice: 0 },
  { tipo: 'tarjeta' },
]

describe('nuevaCapa', () => {
  it('cada tipo nace válido para el documento', () => {
    for (const que of TODAS) {
      expect(esquemaDeCapa.safeParse(nuevaCapa(que, { id: 'n', medidas: cuadrado })).success).toBe(
        true,
      )
    }
  })

  it('nace centrada en el documento o en el punto', () => {
    const capa = nuevaCapa({ tipo: 'forma', forma: 'rectangulo' }, { id: 'n', medidas: cuadrado })
    expect(capa.x + capa.ancho / 2).toBeCloseTo(540)
    expect(capa.y + capa.alto / 2).toBeCloseTo(540)
    const enElPunto = nuevaCapa(
      { tipo: 'forma', forma: 'elipse' },
      { id: 'n', medidas: cuadrado, centro: { x: 100, y: 200 } },
    )
    expect(enElPunto.x + enElPunto.ancho / 2).toBeCloseTo(100)
    expect(enElPunto.y + enElPunto.alto / 2).toBeCloseTo(200)
  })

  it('toma la caja dibujada', () => {
    const caja = { x: 10, y: 20, ancho: 30, alto: 40 }
    expect(
      nuevaCapa({ tipo: 'forma', forma: 'rectangulo' }, { id: 'n', medidas: cuadrado, caja }),
    ).toMatchObject(caja)
  })

  it('la imagen conserva la proporción del archivo', () => {
    const ancha = nuevaCapa(
      { tipo: 'imagen', imagenId: GUID, proporcion: 2 },
      { id: 'n', medidas: cuadrado },
    )
    expect(ancha.ancho / ancha.alto).toBeCloseTo(2)
    const alta = nuevaCapa(
      { tipo: 'logo', varianteId: null, proporcion: 0.5 },
      { id: 'n', medidas: cuadrado },
    )
    expect(alta.ancho / alta.alto).toBeCloseTo(0.5)
  })

  it('la línea dibujada va de un punto al otro', () => {
    const linea = nuevaCapa(
      { tipo: 'linea', desde: { x: 50, y: 10 }, hasta: { x: 10, y: 30 } },
      { id: 'n', medidas: cuadrado },
    )
    expect(linea).toMatchObject({ x: 10, y: 10, ancho: 40, alto: 20 })
    expect(linea.tipo === 'linea' && linea.puntos).toEqual([
      { x: 40, y: 0 },
      { x: 0, y: 20 },
    ])
  })

  it('el texto nace del tamaño del formato', () => {
    expect(tamanoDelTextoNuevo(cuadrado)).toBe(48)
    expect(tamanoDelTextoNuevo(a4)).toBe(24)
  })
})

describe('nombreVisible', () => {
  const de = (que: QueSeAgrega) => nuevaCapa(que, { id: 'n', medidas: cuadrado })

  it('dice lo que es', () => {
    expect(TODAS.map((que) => nombreVisible(de(que)))).toEqual([
      'Texto · Texto',
      'Rectángulo',
      'Elipse',
      'Polígono',
      'Línea',
      'Imagen',
      'Logo',
      'Foto 1',
      'Tarjeta de la cotización',
    ])
    expect(nombreVisible(de({ tipo: 'logo', varianteId: null, proporcion: 1 }), 'Principal')).toBe(
      'Logo · Principal',
    )
  })

  it('el texto, por su primera línea y corto', () => {
    expect(nombreVisible(de({ tipo: 'texto', texto: '  Hola\nmundo' }))).toBe('Texto · Hola')
    expect(nombreVisible(de({ tipo: 'texto', texto: 'a'.repeat(30) }))).toBe(
      `Texto · ${'a'.repeat(24)}…`,
    )
    expect(nombreVisible(de({ tipo: 'texto', texto: '   ' }))).toBe('Texto')
  })

  it('el que le pusieron manda', () => {
    expect(nombreVisible({ ...de({ tipo: 'tarjeta' }), nombre: 'Precio' })).toBe('Precio')
    expect(nombreVisible({ ...de({ tipo: 'tarjeta' }), nombre: '  ' })).toBe(
      'Tarjeta de la cotización',
    )
  })
})
