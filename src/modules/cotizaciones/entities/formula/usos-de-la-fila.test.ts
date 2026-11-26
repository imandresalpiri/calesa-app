import { describe, expect, it } from 'vitest'
import { type Diseno } from '../diseno'
import { enRejilla } from '../diseno-sin-posicion'
import type { Formula } from '../formula'
import type { Nodo } from '../nodos'
import { FORMULA_A1 } from './hoja-a1.soporte'
import { hojaDeLaPlanilla } from './hoja-de-la-planilla'
import {
  filasQueNombra,
  indiceDeUsos,
  listaDeCeldas,
  motivoParaNoEliminar,
  usosDe,
  type ContextoDeUsos,
} from './usos-de-la-fila'

const SIN_NADA: ContextoDeUsos = { diseno: null, tarjeta: { nodos: [], grupos: [] } }

// FORMULA_A1 con una fila suelta al final (9 «Suelta», en la banda «Primer pago»).
const CON_SUELTA: Formula = {
  ...FORMULA_A1,
  definicion: {
    ...FORMULA_A1.definicion,
    nodos: [
      ...FORMULA_A1.definicion.nodos,
      { id: 'suelta', tipo: 'constante', etiqueta: 'Suelta', grupo: 'primer_pago' } as Nodo,
    ],
  },
  params: { ...FORMULA_A1.params, constantes: { ...FORMULA_A1.params.constantes, suelta: 5 } },
}

const motivo = (formula: Formula, numero: number, contexto = SIN_NADA) => {
  const indice = indiceDeUsos(formula, hojaDeLaPlanilla(formula))
  return motivoParaNoEliminar(usosDe(formula, indice, numero, contexto))
}

const disenoCon = (nodo: string): Diseno =>
  enRejilla({
    cabecera: { modos: [], ver_total_bs: false },
    secciones: [
      { id: 's', presentacion: 'principal', items: [{ tipo: 'celda', nodo, ancho: 'completo' }] },
    ],
    tarjeta_total: { nodo: 'total', secundarios: [] },
  })

describe('usosDe y motivoParaNoEliminar', () => {
  it('las filas que la nombran (también desde un texto con auxiliares)', () => {
    const indice = indiceDeUsos(FORMULA_A1, hojaDeLaPlanilla(FORMULA_A1))
    expect(usosDe(FORMULA_A1, indice, 2, SIN_NADA).filas).toEqual([5, 7])
    expect(usosDe(FORMULA_A1, indice, 3, SIN_NADA).filas).toEqual([6, 7])
    expect(motivo(FORMULA_A1, 2)).toBe('La usan C5 y C7.')
    expect(motivo(FORMULA_A1, 7)).toBe('La usa C8.')
  })

  it('el tipo de cambio de una banda, la fila del total y la única de su banda', () => {
    expect(motivo(FORMULA_A1, 1)).toBe('Es el tipo de cambio de «Primer pago».')
    expect(motivo(FORMULA_A1, 8)).toBe('Es la fila del total: elige otra antes.')
    expect(motivo(CON_SUELTA, 9)).toBe(
      'Es la única fila de «Primer pago»: quita la banda o suma otra fila antes.',
    )
  })

  it('el tipo de cambio del total o de un bucket sin banda', () => {
    const def = { ...FORMULA_A1.definicion, grupos: [], total_en: 'tc' }
    expect(motivo({ ...FORMULA_A1, definicion: def }, 1)).toBe(
      'Es el tipo de cambio del total: elige otro antes.',
    )
    const sinTotal = { ...FORMULA_A1, definicion: { ...def, total_en: undefined } }
    expect(motivo(sinTotal, 1)).toMatch(/^Es el tipo de cambio de un bucket/)
  })

  it('la hoja que la muestra y la tarjeta que la nombra (o que no se pudo leer)', () => {
    const sinBanda = { ...CON_SUELTA, definicion: { ...CON_SUELTA.definicion, grupos: [] } }
    expect(motivo(sinBanda, 9)).toBeNull()
    expect(motivo(sinBanda, 9, { ...SIN_NADA, diseno: disenoCon('suelta') })).toBe(
      'La muestra la hoja: quítala en «Hoja» antes.',
    )
    expect(motivo(sinBanda, 9, { diseno: null, tarjeta: { nodos: ['suelta'], grupos: [] } })).toBe(
      'La usa la tarjeta: quítala en «Tarjeta» antes.',
    )
    expect(motivo(sinBanda, 9, { diseno: null, tarjeta: null })).toBe(
      'No se pudo leer la tarjeta: recarga la página para eliminar filas.',
    )
  })

  it('la pct absorbida es parte de su fila: si la hoja la muestra, la fila no se borra', () => {
    const sinTotal = {
      ...FORMULA_A1,
      definicion: {
        ...FORMULA_A1.definicion,
        nodos: FORMULA_A1.definicion.nodos.filter((n) => n.id !== 'total'),
      },
    }
    expect(motivo(sinTotal, 5)).toBeNull()
    expect(motivo(sinTotal, 5, { ...SIN_NADA, diseno: disenoCon('agencia_pct') })).toMatch(/hoja/)
  })

  it('filasQueNombra: lo que nombra su bloque', () => {
    const indice = indiceDeUsos(FORMULA_A1, hojaDeLaPlanilla(FORMULA_A1))
    expect(filasQueNombra(FORMULA_A1, indice, 8)).toEqual([5, 7])
    expect(filasQueNombra(FORMULA_A1, indice, 6)).toEqual([3])
    expect(filasQueNombra(FORMULA_A1, indice, 1)).toEqual([])
  })
})

describe('listaDeCeldas', () => {
  it.each([
    [[9], 'C9'],
    [[9, 12], 'C9 y C12'],
    [[9, 10, 12], 'C9, C10 y C12'],
    [[1, 2, 3, 4, 5, 6, 7], 'C1, C2, C3, C4, C5 y 2 más'],
  ])('%j → %s', (numeros, texto) => {
    expect(listaDeCeldas(numeros)).toBe(texto)
  })
})
