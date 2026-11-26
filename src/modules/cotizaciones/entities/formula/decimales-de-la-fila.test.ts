import { describe, expect, it } from 'vitest'
import type { Formula } from '../formula'
import type { Nodo } from '../nodos'
import { validarFormula } from '../validar'
import {
  cambiarDecimales,
  MENSAJE_FILA_INEXISTENTE,
  MENSAJE_SIN_DECIMALES,
  motivoSinDecimales,
} from './decimales-de-la-fila'
import { hojaDeLaPlanilla } from './hoja-de-la-planilla'
import { conNodoAntes, FORMULA_A1 } from './hoja-a1.soporte'
import { paramsParaValidar } from './params-para-validar'

// FORMULA_A1 válida (Remate en «Primer pago», el total en el TC oficial) y un interruptor al final. Filas: 1 TC · 2 Remate · 3 Fees · … · 8 Total · 9 Garantía.
const VALIDA: Formula = conNodoAntes(
  {
    ...FORMULA_A1,
    definicion: {
      ...FORMULA_A1.definicion,
      total_en: 'tc',
      nodos: FORMULA_A1.definicion.nodos.map((n) =>
        n.id === 'remate' ? { ...n, grupo: 'primer_pago' } : n,
      ),
    },
  },
  { id: 'ga', tipo: 'bandera', etiqueta: 'Garantía' } as Nodo,
  null,
)
const nodo = (f: Formula, id: string) => f.definicion.nodos.find((n) => n.id === id)
const numero = (f: Formula, id: string) => hojaDeLaPlanilla(f).numeroDe.get(id) ?? -1
const cambiar = (...a: Parameters<typeof cambiarDecimales>) => {
  const r = cambiarDecimales(...a)
  if (!r.ok) throw new Error(r.mensaje)
  return r.formula
}

describe('cambiarDecimales', () => {
  it('la fórmula de prueba es válida y sus filas son las de siempre', () => {
    expect(validarFormula(VALIDA.definicion, paramsParaValidar(VALIDA)).ok).toBe(true)
    expect([numero(VALIDA, 'remate'), numero(VALIDA, 'total'), numero(VALIDA, 'ga')]).toEqual([
      2, 8, 9,
    ])
  })

  it('pone los decimales en el nodo de esa fila y en ningún otro; el 0 es 0', () => {
    const f = cambiar(VALIDA, 2, 0)
    expect(nodo(f, 'remate')).toEqual({ ...nodo(VALIDA, 'remate'), decimales: 0 })
    expect(f.definicion.nodos.filter((n) => n.decimales !== undefined).map((n) => n.id)).toEqual([
      'remate',
    ])
    expect(nodo(cambiar(f, 8, 4), 'total')?.decimales).toBe(4)
    // Lo demás de la fórmula es lo mismo: los params, los grupos y el orden.
    expect(f.params).toBe(VALIDA.params)
    expect(f.definicion.grupos).toBe(VALIDA.definicion.grupos)
  })

  it('«Automático» (null) quita la clave: el nodo vuelve a ser el de antes', () => {
    const f = cambiar(cambiar(VALIDA, 2, 3), 2, null)
    expect(nodo(f, 'remate')).toEqual(nodo(VALIDA, 'remate'))
    expect(Object.keys(nodo(f, 'remate') ?? {})).not.toContain('decimales')
    expect(cambiar(VALIDA, 2, null).definicion.nodos).toEqual(VALIDA.definicion.nodos)
  })

  it('un interruptor no lleva decimales; una fila que no está, tampoco', () => {
    expect(cambiarDecimales(VALIDA, 9, 2)).toEqual({ ok: false, mensaje: MENSAJE_SIN_DECIMALES })
    expect(motivoSinDecimales(VALIDA, 9)).toBe(MENSAJE_SIN_DECIMALES)
    expect(cambiarDecimales(VALIDA, 99, 2)).toEqual({
      ok: false,
      mensaje: MENSAJE_FILA_INEXISTENTE,
    })
    expect(motivoSinDecimales(VALIDA, 99)).toBe(MENSAJE_FILA_INEXISTENTE)
    expect(motivoSinDecimales(VALIDA, 2)).toBeNull()
  })

  it('fuera de rango, el mensaje de la forma (el de validar_formula) nombra la celda', () => {
    for (const d of [5, -1, 2.5]) {
      const r = cambiarDecimales(VALIDA, 2, d)
      expect(r.ok, String(d)).toBe(false)
      if (!r.ok) expect(r.mensaje).toContain('decimales')
    }
  })

  it('un rechazo que ya estaba antes no lo frena', () => {
    const rota: Formula = {
      ...VALIDA,
      definicion: { ...VALIDA.definicion, total_en: 'remate' },
    }
    const antes = validarFormula(rota.definicion, paramsParaValidar(rota))
    expect(antes.ok).toBe(false)
    expect(nodo(cambiar(rota, 2, 1), 'remate')?.decimales).toBe(1)
  })
})
