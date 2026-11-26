import { describe, expect, it } from 'vitest'
import { hojaDesde, type HojaLista } from './hoja'
import { crudaDeLaHoja } from './hoja-de-prueba.soporte'
import {
  columnasDelItem,
  rejillaDeLasPiezas,
  rejillaDeLasSecciones,
  rejillaDeLosItems,
} from './posiciones-de-la-hoja'

const celda = (nodo: string, mas: Record<string, unknown> = {}) => ({
  tipo: 'celda',
  nodo,
  etiqueta: nodo.toUpperCase(),
  tipo_nodo: 'input',
  ajustes: false,
  ancho: 'completo',
  formato: 'usd',
  editable: true,
  ...mas,
})
const en = (columna: number, fila: number) => ({ posicion: { columna, fila } })
const seccion = (id: string, items: unknown[], mas: Record<string, unknown> = {}) => ({
  id,
  presentacion: 'principal',
  items,
  ...mas,
})

function hojaCon(secciones: unknown[]): HojaLista {
  const hoja = hojaDesde({ ...crudaDeLaHoja(), secciones })
  if (hoja?.estado !== 'lista') throw new Error('La hoja de prueba no se leyó.')
  return hoja
}
const itemsDe = (h: HojaLista) => h.secciones[0]?.items ?? []

describe('rejillaDeLosItems: el corte de la pieza más exigente y las filas vacías', () => {
  it('una mitad, un hueco y una entera: desde `lg`, con la fila 2 vacía', () => {
    const h = hojaCon([
      seccion('s', [
        celda('a', { ancho: 'mitad', ...en(7, 1) }),
        celda('b', { ancho: 'completo', ...en(1, 3) }),
      ]),
    ])
    expect(rejillaDeLosItems(itemsDe(h))).toEqual({ corte: 'lg', filas: 'auto 2.5rem auto' })
  })

  it('un tercio la lleva a `3xl`; todo entero, siempre', () => {
    const tercio = hojaCon([
      seccion('s', [celda('a', { ancho: 'tercio', ...en(1, 1) }), celda('b', en(1, 2))]),
    ])
    expect(rejillaDeLosItems(itemsDe(tercio))?.corte).toBe('3xl')
    const enteras = hojaCon([seccion('s', [celda('a', en(1, 1)), celda('b', en(1, 4))])])
    expect(rejillaDeLosItems(itemsDe(enteras))).toEqual({
      corte: 'siempre',
      filas: 'auto 2.5rem 2.5rem auto',
    })
  })

  it('una pieza alta ocupa sus filas; sin posición en alguna, o sin ítems, el flujo', () => {
    const alta = hojaCon([
      seccion('s', [celda('a', { ancho: 6, alto: 3, ...en(1, 1) }), celda('b', en(1, 5))]),
    ])
    expect(rejillaDeLosItems(itemsDe(alta))?.filas).toBe('repeat(3,auto) 2.5rem auto')
    const sinPosicion = hojaCon([seccion('s', [celda('a', en(1, 1)), celda('b')])])
    expect(rejillaDeLosItems(itemsDe(sinPosicion))).toBeNull()
    expect(rejillaDeLosItems([])).toBeNull()
  })

  it('en una hoja en par, una sección con un ítem que va en dos dibuja en orden de lectura', () => {
    const h = hojaCon([
      seccion('s', [
        celda('a', { ancho: 'mitad', en_par: true, ...en(1, 1) }),
        celda('b', en(1, 2)),
      ]),
    ])
    expect(rejillaDeLosItems(itemsDe(h), { enPar: true })).toBeNull()
    expect(rejillaDeLosItems(itemsDe(h))?.corte).toBe('lg')
  })

  it('columnasDelItem: la celda con nombre o en número; lo demás, la fila si no dice', () => {
    const h = hojaCon([
      seccion('s', [
        celda('a', { ancho: 'tercio' }),
        celda('b', { ancho: 5 }),
        { tipo: 'subtotal', nodo: 'c', etiqueta: 'C', formato: 'usd' },
        { tipo: 'subtotal', nodo: 'd', etiqueta: 'D', formato: 'usd', ancho: 4 },
      ]),
    ])
    expect(itemsDe(h).map(columnasDelItem)).toEqual([4, 5, 12, 4])
  })
})

describe('rejillaDeLasPiezas: lo de más suma filas, no el corte', () => {
  it('una mitad y el «+» del lienzo debajo de un hueco: el «+» no lleva la rejilla a siempre', () => {
    const mitad = { posicion: { columna: 1, fila: 1 }, ancho: 6, alto: 1 }
    const mas = { posicion: { columna: 1, fila: 3 }, ancho: 12, alto: 1 }
    expect(rejillaDeLasPiezas([mitad], [mas])).toEqual({ corte: 'lg', filas: 'auto 2.5rem auto' })
    expect(rejillaDeLasPiezas([], [mas])).toBeNull()
  })
})

describe('rejillaDeLasSecciones: las principales y el bloque del avanzado', () => {
  const avanzada = seccion('x', [celda('x1')], { presentacion: 'avanzado', ...en(1, 1) })

  it('una «Automática» lleva la rejilla a `5xl`; el bloque, sin fila, debajo de la última', () => {
    const h = hojaCon([
      seccion('a', [celda('a1')], en(1, 1)),
      seccion('b', [celda('b1')], { ancho: 12, ...en(1, 3) }),
      avanzada,
    ])
    expect(rejillaDeLasSecciones(h.secciones, { hayBloque: true })).toEqual({
      corte: '5xl',
      filas: 'auto 2.5rem auto auto',
      filaDelBloque: 4,
    })
  })

  it('con su fila, el bloque llena un hueco; sin bloque que dibujar, el hueco queda', () => {
    const h = hojaCon([
      seccion('a', [celda('a1')], { ancho: 12, ...en(1, 1) }),
      seccion('b', [celda('b1')], { ancho: 4, ...en(1, 3) }),
    ])
    expect(rejillaDeLasSecciones(h.secciones, { avanzado: { fila: 2 }, hayBloque: true })).toEqual({
      corte: '3xl',
      filas: 'repeat(3,auto)',
      filaDelBloque: 2,
    })
    expect(rejillaDeLasSecciones(h.secciones, { avanzado: { fila: 2 }, hayBloque: false })).toEqual(
      { corte: '3xl', filas: 'auto 2.5rem auto', filaDelBloque: 2 },
    )
  })

  it('las avanzadas no cuentan; sin principales o sin posición en alguna, el flujo', () => {
    const h = hojaCon([seccion('a', [celda('a1')], { ancho: 12, ...en(1, 1) }), avanzada])
    expect(rejillaDeLasSecciones(h.secciones, { hayBloque: true })?.corte).toBe('siempre')
    expect(rejillaDeLasSecciones(hojaCon([avanzada]).secciones, { hayBloque: true })).toBeNull()
    const sinPosicion = hojaCon([
      seccion('a', [celda('a1')], en(1, 1)),
      seccion('b', [celda('b1')]),
    ])
    expect(rejillaDeLasSecciones(sinPosicion.secciones, { hayBloque: false })).toBeNull()
  })
})
