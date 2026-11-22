import { describe, expect, it } from 'vitest'
import type { ParteDelTexto } from './cuadricula-de-la-tarjeta'
import {
  caracteresDeLasPartes,
  datosDeLasPartes,
  esTextoConDatos,
  textoDeLasPartes,
} from './texto-con-datos'

const PCT = { tipo: 'dato', nodo: 'transferencia', mostrar: 'porcentaje' } as const
const CLIENTE = { tipo: 'dato', variable: 'cliente_nombre' } as const
const PARTES: ParteDelTexto[] = ['Comisión giro ', PCT, ' para ', CLIENTE]

describe('texto con datos', () => {
  it('distingue un texto con datos de un texto fijo y de un dato', () => {
    expect(esTextoConDatos({ tipo: 'texto', partes: PARTES })).toBe(true)
    expect(esTextoConDatos({ tipo: 'texto', texto: 'Comisión' })).toBe(false)
    expect(esTextoConDatos(PCT)).toBe(false)
  })

  it('el texto literal deja fuera los datos', () => {
    expect(textoDeLasPartes(PARTES)).toBe('Comisión giro  para ')
    expect(textoDeLasPartes([PCT])).toBe('')
  })

  it('cuenta code points, no unidades de UTF-16', () => {
    expect(caracteresDeLasPartes(['🚗 ', PCT, 'á'])).toBe(3)
    expect(caracteresDeLasPartes([CLIENTE])).toBe(0)
  })

  it('los datos, en su orden', () => {
    expect(datosDeLasPartes(PARTES)).toEqual([PCT, CLIENTE])
  })
})
