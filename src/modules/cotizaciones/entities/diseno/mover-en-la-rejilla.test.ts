import { describe, expect, it } from 'vitest'
import type { Diseno } from '../diseno'
import { celda, disenoDe, disenoDeRejillaDePrueba, seccion } from './diseno-de-prueba.soporte'
import {
  destinoEnLaVecina,
  intercambiarAvanzadas,
  moverElBloque,
  moverEnSuEspacio,
  moverPiezaA,
  moverSeccionA,
  pasoDeTeclado,
} from './mover-en-la-rejilla'

const a = { pieza: 'nodo', nodo: 'a' } as const
const b = { pieza: 'nodo', nodo: 'b' } as const
const c = { pieza: 'nodo', nodo: 'c' } as const
const bloque = { pieza: 'bloque-avanzado' } as const

const posicionDe = (d: Diseno, nodo: string) =>
  d.secciones
    .flatMap((s) => s.items.map((it) => ({ s: s.id, it })))
    .find(({ it }) => it.tipo !== 'total' && it.nodo === nodo)
const diseno = (m: { ok: true; diseno: Diseno } | { ok: false }) => {
  if (!m.ok) throw new Error('no se movió')
  return m.diseno
}

describe('mover una pieza en la rejilla', () => {
  it('a un lugar libre de su sección o de otra; nadie más se mueve', () => {
    const d = disenoDeRejillaDePrueba()
    const enSuSeccion = diseno(
      moverPiezaA(d, a, { seccion: 'base', posicion: { columna: 1, fila: 3 } }),
    )
    expect(posicionDe(enSuSeccion, 'a')).toMatchObject({
      s: 'base',
      it: { posicion: { columna: 1, fila: 3 } },
    })
    expect(posicionDe(enSuSeccion, 'b')?.it.posicion).toEqual({ columna: 7, fila: 1 })
    const aOtra = diseno(moverPiezaA(d, a, { seccion: 'extra', posicion: { columna: 1, fila: 2 } }))
    expect(posicionDe(aOtra, 'a')).toMatchObject({
      s: 'extra',
      it: { posicion: { columna: 1, fila: 2 } },
    })
    expect(aOtra.secciones[0]?.items).toHaveLength(2)
  })

  it('un lugar que pisa o se sale no se ocupa, y el total no entra a una avanzada', () => {
    const d = disenoDeRejillaDePrueba()
    expect(moverPiezaA(d, a, { seccion: 'base', posicion: { columna: 7, fila: 1 } })).toEqual({
      ok: false,
      motivo: 'pisa',
      con: b,
    })
    expect(moverPiezaA(d, a, { seccion: 'base', posicion: { columna: 9, fila: 3 } })).toEqual({
      ok: false,
      motivo: 'se_sale',
    })
    const conTotal = disenoDe([
      seccion('base', [celda('a'), { tipo: 'total', ancho: 6 }]),
      seccion('av', [celda('comision')], { presentacion: 'avanzado' }),
    ])
    expect(
      moverPiezaA(
        conTotal,
        { pieza: 'total' },
        { seccion: 'av', posicion: { columna: 1, fila: 2 } },
      ),
    ).toEqual({ ok: false, motivo: 'total' })
    expect(destinoEnLaVecina(conTotal, { pieza: 'total' }, 1)).toBeNull()
  })

  it('una sección y el bloque «Avanzado» se mueven en las principales sin pisarse', () => {
    const d = disenoDeRejillaDePrueba()
    expect(moverSeccionA(d, 'extra', { columna: 1, fila: 1 })).toMatchObject({
      ok: false,
      motivo: 'pisa',
    })
    expect(moverSeccionA(d, 'extra', { columna: 1, fila: 2 })).toEqual({
      ok: false,
      motivo: 'pisa',
      con: bloque,
    })
    const abajo = diseno(moverSeccionA(d, 'extra', { columna: 7, fila: 3 }))
    expect(abajo.secciones.find((s) => s.id === 'extra')?.posicion).toEqual({ columna: 7, fila: 3 })
    expect(moverElBloque(d, 1)).toMatchObject({ ok: false, motivo: 'pisa' })
    expect(diseno(moverElBloque(d, 4)).avanzado).toEqual({ fila: 4 })
  })

  it('«Mover a la sección siguiente» lleva al primer lugar libre de la vecina; en el extremo, nada', () => {
    const d = disenoDeRejillaDePrueba()
    expect(destinoEnLaVecina(d, a, 1)).toEqual({
      seccion: 'extra',
      posicion: { columna: 1, fila: 2 },
    })
    expect(destinoEnLaVecina(d, a, -1)).toBeNull()
    expect(destinoEnLaVecina(d, { pieza: 'nodo', nodo: 'comision' }, -1)).toEqual({
      seccion: 'extra',
      posicion: { columna: 1, fila: 2 },
    })
  })
})

describe('mover con el teclado y las avanzadas', () => {
  it('Alt+flechas: una celda; ocupada, fuera o en el borde no se mueve', () => {
    const d = disenoDeRejillaDePrueba()
    expect(pasoDeTeclado(d, a, 'izquierda')).toEqual({ ok: false, motivo: 'extremo' })
    expect(pasoDeTeclado(d, a, 'arriba')).toEqual({ ok: false, motivo: 'extremo' })
    expect(pasoDeTeclado(d, a, 'derecha')).toEqual({ ok: false, motivo: 'pisa', con: b })
    expect(pasoDeTeclado(d, b, 'derecha')).toEqual({ ok: false, motivo: 'se_sale' })
    expect(posicionDe(diseno(pasoDeTeclado(d, c, 'abajo')), 'c')?.it.posicion).toEqual({
      columna: 1,
      fila: 3,
    })
  })

  it('el bloque salta a la siguiente fila entera libre; arriba, la de las secciones, no', () => {
    const d = disenoDeRejillaDePrueba()
    expect(diseno(pasoDeTeclado(d, bloque, 'abajo')).avanzado).toEqual({ fila: 3 })
    expect(pasoDeTeclado(d, bloque, 'arriba')).toEqual({ ok: false, motivo: 'extremo' })
    expect(pasoDeTeclado(d, bloque, 'derecha')).toEqual({ ok: false, motivo: 'extremo' })
  })

  it('las avanzadas son una lista: soltar una sobre otra o Alt+↑/↓ las intercambia y se vuelven a apilar', () => {
    const d = disenoDe([
      seccion('base', [celda('a')]),
      seccion('av', [celda('comision')], { presentacion: 'avanzado', alto: 2 }),
      seccion('av2', [celda('neto')], { presentacion: 'avanzado' }),
    ])
    const lugares = (x: Diseno) =>
      x.secciones.filter((s) => s.presentacion === 'avanzado').map((s) => [s.id, s.posicion.fila])
    expect(lugares(d)).toEqual([
      ['av', 1],
      ['av2', 3],
    ])
    const intercambiadas = diseno(intercambiarAvanzadas(d, 'av', 'av2'))
    expect(lugares(intercambiadas)).toEqual([
      ['av', 2],
      ['av2', 1],
    ])
    expect(diseno(pasoDeTeclado(d, { pieza: 'seccion', seccion: 'av' }, 'abajo'))).toEqual(
      intercambiadas,
    )
    expect(pasoDeTeclado(d, { pieza: 'seccion', seccion: 'av' }, 'arriba')).toEqual({
      ok: false,
      motivo: 'extremo',
    })
  })
})

describe('mover desde el inspector', () => {
  it('«Columna» y «Fila» del inspector llevan cada pieza dentro de su espacio', () => {
    const d = disenoDeRejillaDePrueba()
    const lugar = { columna: 1, fila: 3 }
    expect(posicionDe(diseno(moverEnSuEspacio(d, a, lugar)), 'a')).toMatchObject({
      s: 'base',
      it: { posicion: lugar },
    })
    expect(moverEnSuEspacio(d, a, { columna: 7, fila: 1 })).toEqual({
      ok: false,
      motivo: 'pisa',
      con: b,
    })
    const seccion = diseno(
      moverEnSuEspacio(d, { pieza: 'seccion', seccion: 'extra' }, { columna: 7, fila: 3 }),
    )
    expect(seccion.secciones.find((s) => s.id === 'extra')?.posicion).toEqual({
      columna: 7,
      fila: 3,
    })
    // El bloque ocupa la fila entera: la columna pedida no cuenta.
    expect(diseno(moverEnSuEspacio(d, bloque, { columna: 5, fila: 4 })).avanzado).toEqual({
      fila: 4,
    })
    expect(moverEnSuEspacio(d, { pieza: 'cabecera' }, lugar)).toEqual({
      ok: false,
      motivo: 'no_esta',
    })
  })
})
