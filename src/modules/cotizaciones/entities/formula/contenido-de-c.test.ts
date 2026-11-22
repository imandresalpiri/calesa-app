import { describe, expect, it } from 'vitest'
import type { Nodo } from '../nodos'
import { contenidoDeLaFila } from './contenido-de-c'
import { FORMULA_A1 } from './hoja-a1.soporte'
import { hojaDeLaPlanilla } from './hoja-de-la-planilla'

// 1 TC oficial · 2 Remate (asesor) · 3 Fees (valor fijo 100) · 4 Flete (asesor) · 5 Agencia · 6 Seguro · 7 CIF · 8 Total.
const hoja = hojaDeLaPlanilla(FORMULA_A1)
const nodo = (id: string) => {
  const n = FORMULA_A1.definicion.nodos.find((x) => x.id === id)
  if (n === undefined) throw new Error(id)
  return n
}
const ctx = (textoConIds: string | null, dicho = 'lo escribe el asesor') => ({
  hoja,
  textoConIds,
  dicho,
})

describe('contenidoDeLaFila: C guarda la fórmula, Ejemplo la unidad, sin repetir la cifra', () => {
  it('un valor fijo: el número en C y Ejemplo vacío', () => {
    expect(contenidoDeLaFila(nodo('fees'), ctx(null))).toEqual({
      c: { tipo: 'valor_fijo' },
      ejemplo: 'nada',
    })
  })

  it('un cálculo: su texto en A1 en C y la cifra en Ejemplo', () => {
    expect(contenidoDeLaFila(nodo('total'), ctx('=cif+agencia'))).toEqual({
      c: { tipo: 'formula', texto: '=C7+C5' },
      ejemplo: 'cifra',
    })
    // Sin «=» en el texto guardado, la C lo suma.
    expect(contenidoDeLaFila(nodo('total'), ctx('cif+agencia')).c).toEqual({
      tipo: 'formula',
      texto: '=C7+C5',
    })
  })

  it('lo que escribe el asesor, un interruptor o un dato del vehículo: de dónde sale en C y la unidad en Ejemplo', () => {
    expect(contenidoDeLaFila(nodo('remate'), ctx(null))).toEqual({
      c: { tipo: 'de_donde_sale', texto: 'lo escribe el asesor' },
      ejemplo: 'unidad',
    })
    const bandera = { id: 'urgente', tipo: 'bandera', etiqueta: 'Urgente' } as Nodo
    expect(contenidoDeLaFila(bandera, ctx(null, 'interruptor')).ejemplo).toBe('unidad')
    const campo = {
      id: 'anio',
      tipo: 'campo_vehiculo',
      etiqueta: 'Año',
      campo: 'anio',
    } as Nodo
    expect(contenidoDeLaFila(campo, ctx(null, 'dato del vehículo: Año')).c).toEqual({
      tipo: 'de_donde_sale',
      texto: 'dato del vehículo: Año',
    })
  })

  it('un tipo de cambio: de dónde sale en C y la cifra en Ejemplo', () => {
    expect(contenidoDeLaFila(nodo('tc'), ctx(null, 'tipo de cambio oficial de hoy'))).toEqual({
      c: { tipo: 'de_donde_sale', texto: 'tipo de cambio oficial de hoy' },
      ejemplo: 'cifra',
    })
  })
})
