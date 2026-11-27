import { describe, expect, it } from 'vitest'
import type { Diseno } from '../diseno'
import { celda, disenoDe, disenoDeRejillaDePrueba, seccion } from './diseno-de-prueba.soporte'
import {
  cambiarDeEspacio,
  lugarDe,
  lugarLibre,
  ocupantes,
  ordenarPorLectura,
  primerLugarLibre,
} from './lugar-en-la-rejilla'
import { textoDeLaPieza } from './pieza-de-la-hoja'

const enBase = { tipo: 'seccion', seccion: 'base' } as const
const lugar = (columna: number, fila: number, ancho = 6, alto = 1) => ({
  posicion: { columna, fila },
  ancho,
  alto,
})

describe('el lugar de cada pieza en la rejilla', () => {
  it('la conversión deja cada pieza en su lugar y el bloque en la fila de su primera avanzada', () => {
    const d = disenoDeRejillaDePrueba()
    expect(d.avanzado).toEqual({ fila: 2 })
    expect(lugarDe(d, { pieza: 'nodo', nodo: 'b' })?.pieza).toEqual(lugar(7, 1))
    expect(lugarDe(d, { pieza: 'seccion', seccion: 'extra' })?.pieza).toEqual(lugar(7, 1))
    expect(lugarDe(d, { pieza: 'bloque-avanzado' })?.pieza).toEqual(lugar(1, 2, 12))
    expect(lugarDe(d, { pieza: 'cabecera' })).toBeNull()
    expect(ocupantes(d, { tipo: 'principales' }).map((o) => textoDeLaPieza(o.pieza))).toEqual([
      'seccion-base',
      'seccion-extra',
      'bloque-avanzado',
    ])
  })

  it('lugarLibre: el propio lugar vale, otra pieza lo pisa y pasar la columna 12 se sale', () => {
    const d = disenoDeRejillaDePrueba()
    const a = { pieza: 'nodo', nodo: 'a' } as const
    expect(lugarLibre(d, a, enBase, lugar(1, 1))).toEqual({ ok: true })
    expect(lugarLibre(d, a, enBase, lugar(7, 1))).toEqual({
      ok: false,
      motivo: 'pisa',
      con: { pieza: 'nodo', nodo: 'b' },
    })
    expect(lugarLibre(d, a, enBase, lugar(9, 3))).toEqual({ ok: false, motivo: 'se_sale' })
    expect(lugarLibre(d, a, enBase, lugar(1, 200, 6, 2))).toEqual({ ok: false, motivo: 'se_sale' })
    expect(lugarLibre(d, null, enBase, lugar(1, 1))).toMatchObject({ ok: false, motivo: 'pisa' })
    // Una sección nueva no puede ir en la fila del bloque.
    expect(lugarLibre(d, null, { tipo: 'principales' }, lugar(1, 2))).toEqual({
      ok: false,
      motivo: 'pisa',
      con: { pieza: 'bloque-avanzado' },
    })
  })

  it('primerLugarLibre: el primero en orden de lectura donde entra, o el primero después de una posición', () => {
    const d = disenoDeRejillaDePrueba()
    expect(primerLugarLibre(d, enBase, { ancho: 6, alto: 1 })).toEqual({ columna: 1, fila: 3 })
    expect(primerLugarLibre(d, enBase, { ancho: 4, alto: 1 }, { columna: 1, fila: 3 })).toEqual({
      columna: 2,
      fila: 3,
    })
    expect(primerLugarLibre(d, { tipo: 'principales' }, { ancho: 6, alto: 1 })).toEqual({
      columna: 1,
      fila: 3,
    })
    expect(primerLugarLibre(d, enBase, { ancho: 13, alto: 1 })).toBeNull()
  })
})

describe('el orden de lectura y el cambio de espacio', () => {
  it('ordenarPorLectura: las principales y sus ítems en orden de lectura, con las avanzadas donde va su bloque', () => {
    const d = disenoDeRejillaDePrueba()
    const [base, extra, av] = d.secciones
    if (!base || !extra || !av) throw new Error('falta una sección')
    const desordenado: Diseno = {
      ...d,
      avanzado: { fila: 5 },
      secciones: [
        { ...extra, posicion: { columna: 1, fila: 6 } },
        av,
        { ...base, items: [...base.items].reverse() },
      ],
    }
    const ordenado = ordenarPorLectura(desordenado)
    expect(ordenado.secciones.map((s) => s.id)).toEqual(['base', 'av', 'extra'])
    expect(ordenado.secciones[0]?.items.map((it) => it.tipo === 'celda' && it.nodo)).toEqual([
      'a',
      'b',
      'c',
    ])
    const { avanzado: _, ...sinBloque } = desordenado
    expect(ordenarPorLectura(sinBloque).secciones.map((s) => s.id)).toEqual(['base', 'extra', 'av'])
  })

  it('cambiarDeEspacio: a avanzada va al final de su lista; a principal, al primer lugar libre, y sin avanzadas el bloque se va', () => {
    const d = disenoDeRejillaDePrueba()
    const aAvanzada = cambiarDeEspacio(d, 'extra', 'avanzado')
    expect(aAvanzada.secciones.map((s) => [s.id, s.presentacion, s.posicion])).toEqual([
      ['base', 'principal', { columna: 1, fila: 1 }],
      ['av', 'avanzado', { columna: 1, fila: 1 }],
      ['extra', 'avanzado', { columna: 1, fila: 2 }],
    ])
    expect(aAvanzada.avanzado).toEqual({ fila: 2 })
    const aPrincipal = cambiarDeEspacio(d, 'av', 'principal')
    expect(aPrincipal.secciones.find((s) => s.id === 'av')?.posicion).toEqual({
      columna: 1,
      fila: 3,
    })
    expect('avanzado' in aPrincipal).toBe(false)
    expect(cambiarDeEspacio(d, 'base', 'principal')).toBe(d)
  })

  it('la primera avanzada trae el bloque, en la fila que sigue a las principales que quedan', () => {
    const d = disenoDe([seccion('base', [celda('a')]), seccion('extra', [celda('neto')])])
    expect(d.avanzado).toBeUndefined()
    const conBloque = cambiarDeEspacio(d, 'base', 'avanzado')
    expect(conBloque.avanzado).toEqual({ fila: 2 })
    expect(conBloque.secciones.map((s) => [s.id, s.posicion])).toEqual([
      ['extra', { columna: 7, fila: 1 }],
      ['base', { columna: 1, fila: 1 }],
    ])
  })
})
