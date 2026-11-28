import { describe, expect, it } from 'vitest'
import {
  ALINEACION_EN_EL_LIENZO,
  cajaParaContener,
  puntosDelDegradado,
  puntosDelPoligono,
  recorteParaCubrir,
} from './dibujo'

const pares = (puntos: number[]) =>
  puntos.flatMap((v, i) => (i % 2 === 0 ? [[v, puntos[i + 1] ?? Number.NaN]] : []))

describe('el polígono llena su caja', () => {
  it('el triángulo, con la punta arriba al medio y la base abajo', () => {
    const [punta, ...base] = pares(puntosDelPoligono(3, 100, 90))
    expect(punta?.[0]).toBeCloseTo(50)
    expect(punta?.[1]).toBeCloseTo(0)
    for (const vertice of base) {
      expect(vertice[1]).toBeCloseTo(90)
    }
    expect(base.map((v) => v[0]).sort((a = 0, b = 0) => a - b)).toEqual([
      expect.closeTo(0),
      expect.closeTo(100),
    ])
  })

  it('cada lado de la caja lo toca un vértice, con cualquier cantidad de lados', () => {
    for (const lados of [3, 5, 6, 12]) {
      const vertices = pares(puntosDelPoligono(lados, 200, 80))
      expect(vertices).toHaveLength(lados)
      expect(Math.min(...vertices.map((v) => v[0] ?? 0))).toBeCloseTo(0)
      expect(Math.max(...vertices.map((v) => v[0] ?? 0))).toBeCloseTo(200)
      expect(Math.min(...vertices.map((v) => v[1] ?? 0))).toBeCloseTo(0)
      expect(Math.max(...vertices.map((v) => v[1] ?? 0))).toBeCloseTo(80)
    }
  })

  it('menos de 3 lados dibuja un triángulo', () => {
    expect(puntosDelPoligono(1, 10, 10)).toHaveLength(6)
  })
})

describe('el degradado del fondo, como en CSS', () => {
  const medidas = { ancho: 200, alto: 100 }
  const cerca = (p: { x: number; y: number }) => ({
    x: expect.closeTo(p.x),
    y: expect.closeTo(p.y),
  })

  it('180° va de arriba hacia abajo y 90° de izquierda a derecha', () => {
    expect(puntosDelDegradado(medidas, 180)).toEqual({
      inicio: cerca({ x: 100, y: 0 }),
      fin: cerca({ x: 100, y: 100 }),
    })
    expect(puntosDelDegradado(medidas, 90)).toEqual({
      inicio: cerca({ x: 0, y: 50 }),
      fin: cerca({ x: 200, y: 50 }),
    })
    expect(puntosDelDegradado(medidas, 0)).toEqual({
      inicio: cerca({ x: 100, y: 100 }),
      fin: cerca({ x: 100, y: 0 }),
    })
  })

  it('en diagonal la línea llega a las esquinas', () => {
    const { inicio, fin } = puntosDelDegradado({ ancho: 100, alto: 100 }, 135)
    expect(inicio).toEqual(cerca({ x: 0, y: 0 }))
    expect(fin).toEqual(cerca({ x: 100, y: 100 }))
  })
})

describe('cómo entra una imagen en su caja', () => {
  it('cubrir recorta lo que sobra, centrado', () => {
    expect(recorteParaCubrir({ ancho: 1600, alto: 900 }, { ancho: 100, alto: 100 })).toEqual({
      x: 350,
      y: 0,
      ancho: 900,
      alto: 900,
    })
    expect(recorteParaCubrir({ ancho: 100, alto: 400 }, { ancho: 200, alto: 100 })).toEqual({
      x: 0,
      y: 175,
      ancho: 100,
      alto: 50,
    })
  })

  it('contener la deja entera y centrada', () => {
    expect(cajaParaContener({ ancho: 1600, alto: 900 }, { ancho: 100, alto: 100 })).toEqual({
      x: 0,
      y: 21.875,
      ancho: 100,
      alto: 56.25,
    })
  })

  it('sin medidas, la imagen entera y la caja entera', () => {
    expect(recorteParaCubrir({ ancho: 0, alto: 0 }, { ancho: 10, alto: 10 })).toEqual({
      x: 0,
      y: 0,
      ancho: 0,
      alto: 0,
    })
    expect(cajaParaContener({ ancho: 10, alto: 10 }, { ancho: 0, alto: 30 })).toEqual({
      x: 0,
      y: 0,
      ancho: 0,
      alto: 30,
    })
  })
})

describe('la alineación del texto', () => {
  it('la de Konva', () => {
    expect(ALINEACION_EN_EL_LIENZO).toEqual({
      izquierda: 'left',
      centro: 'center',
      derecha: 'right',
    })
  })
})
