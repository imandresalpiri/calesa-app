import { describe, expect, it } from 'vitest'
import { disposicionDelTexto, partirEnLineas, type MetricasDelTexto } from './disposicion-del-texto'

// Cada grafema mide 10: «hola mundo» mide 100.
const medir = (texto: string) => Array.from(texto).length * 10
const METRICAS: MetricasDelTexto = { medir, ascenso: 20, descenso: 6 }

describe('partirEnLineas', () => {
  it('lo que entra va entero, con sus espacios', () => {
    expect(partirEnLineas('hola mundo ', 200, medir)).toEqual(['hola mundo '])
  })

  it('corta en el último espacio que entra y quita los espacios del corte', () => {
    expect(partirEnLineas('hola   mundo feliz', 100, medir)).toEqual(['hola', 'mundo', 'feliz'])
  })

  it('corta después de un guion, nunca antes', () => {
    expect(partirEnLineas('ultra-liviano', 80, medir)).toEqual(['ultra-', 'liviano'])
    expect(partirEnLineas('a--b', 30, medir)).toEqual(['a--', 'b'])
  })

  it('una palabra que no entra se corta por grafema', () => {
    expect(partirEnLineas('abcdefghij', 40, medir)).toEqual(['abcd', 'efgh', 'ij'])
  })

  it('una caja más angosta que un grafema pone uno por línea y no pierde el resto', () => {
    expect(partirEnLineas('abc', 5, medir)).toEqual(['a', 'b', 'c'])
  })

  it('respeta los párrafos y las líneas vacías', () => {
    expect(partirEnLineas('uno\n\ndos tres\r\ncuatro', 60, medir)).toEqual([
      'uno',
      '',
      'dos',
      'tres',
      'cuatro',
    ])
  })

  it('no parte un grafema compuesto', () => {
    const bandera = '🇧🇴'
    expect(
      partirEnLineas(
        `${bandera}${bandera}`,
        15,
        (t) => [...new Intl.Segmenter().segment(t)].length * 10,
      ),
    ).toEqual([bandera, bandera])
  })
})

describe('disposicionDelTexto', () => {
  const capa = { texto: 'hola mundo feliz', ancho: 90, tamano: 10, interlineado: 2 }

  it('la base de cada línea es la de Konva y el alto, líneas × interlineado', () => {
    const { lineas, alto } = disposicionDelTexto({ ...capa, alineacion: 'izquierda' }, METRICAS)
    // lh = 20; la primera base en (20 − 6)/2 + 20/2 = 17.
    expect(lineas.map((l) => l.base)).toEqual([17, 37, 57])
    expect(alto).toBe(60)
  })

  it('ubica cada línea según la alineación', () => {
    const x = (alineacion: 'izquierda' | 'centro' | 'derecha') =>
      disposicionDelTexto({ ...capa, alineacion }, METRICAS).lineas.map((l) => [l.texto, l.x])
    expect(x('izquierda')).toEqual([
      ['hola', 0],
      ['mundo', 0],
      ['feliz', 0],
    ])
    expect(x('centro')).toEqual([
      ['hola', 25],
      ['mundo', 20],
      ['feliz', 20],
    ])
    expect(x('derecha')).toEqual([
      ['hola', 50],
      ['mundo', 40],
      ['feliz', 40],
    ])
  })

  it('un texto vacío ocupa una línea', () => {
    const { lineas, alto } = disposicionDelTexto(
      { ...capa, texto: '', alineacion: 'izquierda' },
      METRICAS,
    )
    expect(lineas).toEqual([{ texto: '', x: 0, base: 17, ancho: 0 }])
    expect(alto).toBe(20)
  })
})
