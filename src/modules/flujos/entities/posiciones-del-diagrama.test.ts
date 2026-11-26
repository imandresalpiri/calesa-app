import { describe, expect, it } from 'vitest'
import { disponerDiagrama, medidasDelDiagrama } from './disposicion-del-diagrama'
import {
  apilar,
  conPendientes,
  pendientesVigentes,
  cambiosAlMover,
  deshacer,
  enElAcomodo,
  loQueHabia,
  pasoDeTeclado,
  posicionDeLaNuevaFase,
  posicionesDeOrdenarSolo,
  posicionesEfectivas,
  posicionPedida,
  TOPE_DE_DESHACER,
  yaGuardado,
} from './posiciones-del-diagrama'

const rem = 16
const m = medidasDelDiagrama(rem)
const enRem = medidasDelDiagrama(1)
const sin = (id: string) => ({ id, posicion: null })
const en = (id: string, x: number, y: number) => ({ id, posicion: { x, y } })
const auto = disponerDiagrama([{ id: 'a' }, { id: 'b' }, { id: 'c' }], [], m)

describe('posicionesEfectivas', () => {
  it('sin ninguna guardada, el acomodo automático en rem', () => {
    const e = posicionesEfectivas([sin('a'), sin('b'), sin('c')], auto, rem)
    expect(e.get('b')).toEqual({
      x: (auto.nodos[1]?.x ?? 0) / rem,
      y: (auto.nodos[1]?.y ?? 0) / rem,
    })
  })

  it('con alguna guardada, las que no van a la derecha de la más a la derecha, a su altura', () => {
    const e = posicionesEfectivas([en('a', 10, 4), sin('b'), en('c', 40, 20), sin('d')], auto, rem)
    expect(e.get('a')).toEqual({ x: 10, y: 4 })
    const paso = enRem.ancho + enRem.separacion
    expect(e.get('b')).toEqual({ x: 40 + paso, y: 20 })
    expect(e.get('d')).toEqual({ x: 40 + 2 * paso, y: 20 })
  })
})

describe('cambiosAlMover', () => {
  it('en un flujo sin posiciones, el primer arrastre guarda también las demás donde se ven', () => {
    const fasesSin = [sin('a'), sin('b'), sin('c')]
    const e = posicionesEfectivas(fasesSin, auto, rem)
    const cambios = cambiosAlMover(e, fasesSin, [{ faseId: 'b', x: 30.004, y: -2 }])
    expect(cambios[0]).toEqual({ faseId: 'b', x: 30, y: -2 })
    expect(cambios.map((c) => c.faseId).sort()).toEqual(['a', 'b', 'c'])
    expect(cambios.find((c) => c.faseId === 'a')).toEqual({ faseId: 'a', ...e.get('a') })
  })

  it('con todas guardadas, sólo las movidas; fuera del rango se acota', () => {
    const todas = [en('a', 0, 0), en('b', 20, 0)]
    const e = posicionesEfectivas(todas, auto, rem)
    expect(cambiosAlMover(e, todas, [{ faseId: 'a', x: 99999, y: 0 }])).toEqual([
      { faseId: 'a', x: 10000, y: 0 },
    ])
  })
})

describe('Ordenar solo', () => {
  it('manda todas al acomodo automático, y después ya está en el acomodo', () => {
    const cambios = posicionesDeOrdenarSolo(auto, rem)
    expect(cambios).toHaveLength(3)
    const guardadas = cambios.map((c) => en(c.faseId, c.x ?? 0, c.y ?? 0))
    expect(enElAcomodo(posicionesEfectivas(guardadas, auto, rem), auto, rem)).toBe(true)
    const movida = [en('a', 99, 99), ...guardadas.slice(1)]
    expect(enElAcomodo(posicionesEfectivas(movida, auto, rem), auto, rem)).toBe(false)
  })
})

describe('el teclado y la fase nueva', () => {
  it('una flecha mueve 1 rem; con Shift, 10; otra tecla nada', () => {
    expect(pasoDeTeclado('ArrowRight', false)).toEqual({ x: 1, y: 0 })
    expect(pasoDeTeclado('ArrowUp', true)).toEqual({ x: 0, y: -10 })
    expect(pasoDeTeclado('Enter', false)).toBeNull()
  })

  it('la fase nueva nace con el centro de su caja en el punto pedido, en la rejilla', () => {
    expect(posicionDeLaNuevaFase({ x: 20.4, y: 10 })).toEqual({
      x: Math.round(20.4 - enRem.ancho / 2),
      y: Math.round(10 - enRem.alto / 2),
    })
  })

  it('el parámetro ?en=: bien formado y dentro del rango, o nada', () => {
    expect(posicionPedida('12.5,-3')).toEqual({ x: 12.5, y: -3 })
    expect(posicionPedida(null)).toBeNull()
    expect(posicionPedida('12')).toBeNull()
    expect(posicionPedida('x,1')).toBeNull()
    expect(posicionPedida('20000,1')).toBeNull()
  })
})

describe('deshacer', () => {
  it('guarda lo que había, también «sin posición»', () => {
    const guardadas = new Map([
      ['a', { x: 1, y: 2 }],
      ['b', null],
    ])
    expect(
      loQueHabia(guardadas, [
        { faseId: 'a', x: 5, y: 5 },
        { faseId: 'b', x: 6, y: 6 },
      ]),
    ).toEqual([
      { faseId: 'a', x: 1, y: 2 },
      { faseId: 'b', x: null, y: null },
    ])
  })

  it('la pila tiene tope y devuelve el último paso', () => {
    let pila = apilar([], [])
    expect(pila).toEqual([])
    for (let i = 0; i < TOPE_DE_DESHACER + 5; i++)
      pila = apilar(pila, [{ faseId: 'a', x: i, y: 0 }])
    expect(pila).toHaveLength(TOPE_DE_DESHACER)
    const r = deshacer(pila)
    expect(r?.paso).toEqual([{ faseId: 'a', x: TOPE_DE_DESHACER + 4, y: 0 }])
    expect(r?.pila).toHaveLength(TOPE_DE_DESHACER - 1)
    expect(deshacer([])).toBeNull()
  })

  it('un cambio pendiente se va cuando lo leído ya lo trae', () => {
    expect(yaGuardado({ faseId: 'a', x: 1, y: 2 }, { x: 1, y: 2 })).toBe(true)
    expect(yaGuardado({ faseId: 'a', x: 1, y: 2 }, { x: 1, y: 3 })).toBe(false)
    expect(yaGuardado({ faseId: 'a', x: null, y: null }, null)).toBe(true)
    expect(yaGuardado({ faseId: 'a', x: 1, y: 2 }, undefined)).toBe(true)
  })
})

describe('lo pendiente sobre lo leído', () => {
  const leidas = new Map([
    ['a', { x: 1, y: 1 }],
    ['b', null],
  ])
  const pend = (faseId: string, x: number, guardadaEn: string | null = null) => ({
    cambio: { faseId, x, y: 1 },
    guardadaEn,
  })

  it('se va cuando lo leído lo trae, o cuando se leyó una versión no anterior a su escritura', () => {
    const pendientes = new Map([
      ['a', pend('a', 1)],
      ['b', pend('b', 5, 'v2')],
      ['z', pend('z', 5)],
    ])
    expect([...pendientesVigentes(pendientes, leidas, () => false).keys()]).toEqual(['b'])
    expect([...pendientesVigentes(pendientes, leidas, (v) => v === 'v2').keys()]).toEqual([])
  })

  it('se dibuja encima de lo leído', () => {
    const fases = [en('a', 1, 1), sin('b')]
    const encima = conPendientes(fases, new Map([['b', pend('b', 7)]]))
    expect(encima.map((f) => f.posicion)).toEqual([
      { x: 1, y: 1 },
      { x: 7, y: 1 },
    ])
  })
})
