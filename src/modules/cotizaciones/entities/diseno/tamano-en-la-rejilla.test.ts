import { describe, expect, it } from 'vitest'
import type { Diseno } from '../diseno'
import { celda, disenoDe, disenoDeRejillaDePrueba, seccion } from './diseno-de-prueba.soporte'
import { textoDeLaPieza } from './pieza-de-la-hoja'
import { opcionesDelLugar, ponerTamano, tamanoQueEntra } from './tamano-en-la-rejilla'

const a = { pieza: 'nodo', nodo: 'a' } as const
const b = { pieza: 'nodo', nodo: 'b' } as const
const c = { pieza: 'nodo', nodo: 'c' } as const
const enComillas = (p: Parameters<typeof textoDeLaPieza>[0]) => `«${textoDeLaPieza(p)}»`
const extra = { pieza: 'seccion', seccion: 'extra' } as const

const itemDe = (d: Diseno, nodo: string) =>
  d.secciones.flatMap((s) => s.items).find((it) => it.tipo !== 'total' && it.nodo === nodo)

describe('el tamaño de una pieza en la rejilla', () => {
  it('crecer se topa con la vecina, el borde o el tope de filas; achicar siempre entra', () => {
    const d = disenoDeRejillaDePrueba()
    expect(tamanoQueEntra(d, a, { ancho: 12 })).toEqual({
      tamano: { ancho: 6, alto: 1 },
      tope: { lado: 'ancho', motivo: 'pisa', con: b },
    })
    expect(tamanoQueEntra(d, a, { alto: 2 })).toEqual({
      tamano: { ancho: 6, alto: 1 },
      tope: { lado: 'alto', motivo: 'pisa', con: c },
    })
    expect(tamanoQueEntra(d, b, { ancho: 7 })).toEqual({
      tamano: { ancho: 6, alto: 1 },
      tope: { lado: 'ancho', motivo: 'borde' },
    })
    expect(tamanoQueEntra(d, c, { alto: 3 })).toEqual({
      tamano: { ancho: 12, alto: 3 },
      tope: null,
    })
    expect(tamanoQueEntra(d, c, { alto: 9 })).toEqual({
      tamano: { ancho: 12, alto: 4 },
      tope: { lado: 'alto', motivo: 'maximo' },
    })
    expect(tamanoQueEntra(d, a, { ancho: 4 })).toEqual({
      tamano: { ancho: 4, alto: 1 },
      tope: null,
    })
  })

  it('ponerTamano escribe lo que entra y nada más; una fila quita el alto', () => {
    const d = disenoDeRejillaDePrueba()
    expect(itemDe(ponerTamano(d, b, { ancho: 4 }), 'b')).toMatchObject({ ancho: 4 })
    const alta = ponerTamano(d, c, { alto: 2 })
    expect(itemDe(alta, 'c')).toMatchObject({ alto: 2 })
    expect(itemDe(ponerTamano(alta, c, { alto: 1 }), 'c')).not.toHaveProperty('alto')
    // «base» es «Automática» y no puede crecer (está «extra» al lado): sigue «Automática».
    const base = { pieza: 'seccion', seccion: 'base' } as const
    expect(ponerTamano(d, base, { ancho: 12 }).secciones[0]).not.toHaveProperty('ancho')
    const angosta = ponerTamano(d, extra, { ancho: 4 })
    expect(angosta.secciones[1]).toMatchObject({ ancho: 4 })
    expect(ponerTamano(angosta, extra, { ancho: 'automatica' }).secciones[1]).not.toHaveProperty(
      'ancho',
    )
  })

  it('ponerTamano: el ancho se topa con la vecina o el borde; en lo que no es celda, 12 quita la clave', () => {
    const d = disenoDe([seccion('s', [celda('a', { ancho: 6 }), { tipo: 'total', ancho: 4 }])])
    const total = { pieza: 'total' } as const
    // «a» va en 1–6 y la tarjeta del total en 7–10: «a» se topa con ella y la tarjeta, con el borde.
    expect(ponerTamano(d, a, { ancho: 20 }).secciones[0]?.items[0]).toMatchObject({ ancho: 6 })
    expect(ponerTamano(d, total, { ancho: 12 }).secciones[0]?.items[1]).toMatchObject({ ancho: 6 })
    const sola = disenoDe([
      seccion('s', [celda('a', { ancho: 6 }), celda('b'), { tipo: 'total', ancho: 4 }]),
    ])
    expect(ponerTamano(sola, a, { ancho: 20 }).secciones[0]?.items[0]).toMatchObject({ ancho: 12 })
    expect(ponerTamano(sola, total, { ancho: 12 }).secciones[0]?.items[2]).toEqual({
      tipo: 'total',
      posicion: { columna: 1, fila: 3 },
    })
  })

  it('opcionesDelLugar: cada valor con el resto como está, y el que no entra con su motivo', () => {
    const opciones = opcionesDelLugar(disenoDeRejillaDePrueba(), a, enComillas)
    const motivos = (xs: { valor: number; motivo: string | null }[] | undefined) =>
      xs?.map((x) => `${String(x.valor)} ${x.motivo ?? 'libre'}`)
    const pisaB = 'se pisa con «b»'
    const pisaC = 'se pisa con «c»'
    const seSale = 'se sale de las 12 columnas'
    expect(motivos(opciones?.columna)).toEqual([
      '1 libre',
      ...[2, 3, 4, 5, 6, 7].map((n) => `${String(n)} ${pisaB}`),
      ...[8, 9, 10, 11, 12].map((n) => `${String(n)} ${seSale}`),
    ])
    expect(motivos(opciones?.fila)).toEqual(['1 libre', `2 ${pisaC}`, '3 libre'])
    expect(motivos(opciones?.ancho)).toEqual([
      ...[1, 2, 3, 4, 5, 6].map((n) => `${String(n)} libre`),
      ...[7, 8, 9, 10, 11, 12].map((n) => `${String(n)} ${pisaB}`),
    ])
    expect(motivos(opciones?.alto)).toEqual(['1 libre', `2 ${pisaC}`, `3 ${pisaC}`, `4 ${pisaC}`])
    expect(
      opcionesDelLugar(disenoDeRejillaDePrueba(), { pieza: 'cabecera' }, enComillas),
    ).toBeNull()
  })
})
