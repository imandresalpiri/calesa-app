import { describe, expect, it } from 'vitest'
import type { Formula } from '../formula'
import type { Nodo } from '../nodos'
import {
  aplicarLoEscrito,
  cambioAlAlternar,
  MENSAJE_AL_COTIZAR_EN_C,
  MENSAJE_DEL_ASESOR_EN_C,
  unidadConElCambio,
  type PedidoDeLaCelda,
} from './escrito-en-la-celda'
import { conNodoAntes, FORMULA_A1 } from './hoja-a1.soporte'
import { hojaDeLaPlanilla } from './hoja-de-la-planilla'
import { MOTIVO_DEL_EJEMPLO, textoDeLaCelda, type ContextoDelTexto } from './texto-de-la-celda'
import { UNIDAD_EN_CEROS } from './unidad-de-ejemplo'

// 1 TC oficial · 2 Remate (asesor) · 3 Fees (valor fijo 100) · 4 Flete (asesor) · 5 Agencia (B5 absorbida, 4 %) · 6 Seguro (B6 en su texto, 2 %) · 7 CIF · 8 Total.
const LOCALE = 'es-BO'

const pedido = (
  numero: number,
  col: PedidoDeLaCelda['col'],
  texto: string,
  formula: Formula = FORMULA_A1,
): PedidoDeLaCelda => ({
  formula,
  hoja: hojaDeLaPlanilla(formula),
  numero,
  col,
  texto,
  locale: LOCALE,
  tablas: null,
})

const nodo = (f: Formula, id: string) => f.definicion.nodos.find((n) => n.id === id)

const formulaDe = (r: ReturnType<typeof aplicarLoEscrito>): Formula => {
  if (r.tipo !== 'formula') throw new Error(`se esperaba una fórmula: ${JSON.stringify(r)}`)
  return r.formula
}

describe('aplicarLoEscrito', () => {
  it('«=» traduce A1 a ids y compila: el texto guardado nunca lleva C5', () => {
    const f = formulaDe(aplicarLoEscrito(pedido(7, 'C', '=C2+C3*2')))
    expect(nodo(f, 'cif')).toMatchObject({ texto: '=remate+fees*2' })
  })

  it('una referencia hacia abajo dice qué fila y deja mover; el tramo es el de lo tipeado', () => {
    const r = aplicarLoEscrito(pedido(3, 'C', '=C2 + C7'))
    expect(r).toMatchObject({
      tipo: 'error',
      error: { moverDebajoDe: 7, tramo: { desde: 6, largo: 2 } },
    })
  })

  it('un error del compilador vuelve a lo tipeado y nombra en A1', () => {
    const r = aplicarLoEscrito(pedido(7, 'C', '=C2+'))
    expect(r.tipo).toBe('error')
    if (r.tipo === 'error') expect(r.error.tramo).not.toBeNull()
  })

  it('un número en un valor fijo cambia su valor; en un cálculo, lo vuelve valor fijo', () => {
    const f = formulaDe(aplicarLoEscrito(pedido(3, 'C', '250,5')))
    expect(f.params.constantes['fees']).toBe(250.5)
    const g = formulaDe(aplicarLoEscrito(pedido(7, 'C', '1000')))
    expect(nodo(g, 'cif')).toMatchObject({ tipo: 'constante', etiqueta: 'CIF' })
    expect(g.params.constantes['cif']).toBe(1000)
  })

  it('en Ejemplo, un número en lo que escribe el asesor es el valor de la unidad de ejemplo; en C, «=» lo vuelve cálculo', () => {
    expect(aplicarLoEscrito(pedido(2, 'D', '5.000'))).toEqual({
      tipo: 'unidad',
      cambio: { tipo: 'input', id: 'remate', valor: 5000 },
    })
    const f = formulaDe(aplicarLoEscrito(pedido(4, 'C', '=C3/2')))
    expect(nodo(f, 'flete')).toMatchObject({ tipo: 'calculo', texto: '=fees/2' })
  })

  it('en la C de lo que escribe el asesor, un número no se guarda (no se vuelve valor fijo) y vacío no cambia nada', () => {
    expect(aplicarLoEscrito(pedido(2, 'C', '5.000'))).toMatchObject({
      tipo: 'error',
      error: { mensaje: MENSAJE_DEL_ASESOR_EN_C },
    })
    expect(aplicarLoEscrito(pedido(2, 'C', '  '))).toEqual({ tipo: 'nada' })
  })

  it('Ejemplo no se escribe en un valor fijo, un cálculo ni con «=»', () => {
    expect(aplicarLoEscrito(pedido(3, 'D', '5'))).toMatchObject({
      error: { mensaje: 'El valor fijo se escribe en C3.' },
    })
    expect(aplicarLoEscrito(pedido(7, 'D', '5'))).toMatchObject({
      error: { mensaje: MOTIVO_DEL_EJEMPLO },
    })
    expect(aplicarLoEscrito(pedido(2, 'D', '=C3'))).toMatchObject({
      error: { mensaje: 'Ejemplo es el valor de la unidad de ejemplo: la fórmula va en C2.' },
    })
  })

  it('el tipo de cambio no se escribe; un cálculo vacío pide algo', () => {
    expect(aplicarLoEscrito(pedido(1, 'C', '7'))).toMatchObject({ tipo: 'error' })
    expect(aplicarLoEscrito(pedido(7, 'C', ' '))).toMatchObject({
      tipo: 'error',
      error: { mensaje: 'Escribe un número o una fórmula que empiece con «=».' },
    })
  })

  it('A cambia el concepto; vacío se rechaza', () => {
    const f = formulaDe(aplicarLoEscrito(pedido(3, 'A', ' Gastos ')))
    expect(nodo(f, 'fees')?.etiqueta).toBe('Gastos')
    expect(aplicarLoEscrito(pedido(3, 'A', ''))).toMatchObject({ tipo: 'error' })
  })

  it('B cambia el % absorbido (en puntos) y el escrito en la fórmula; sin % se rechaza', () => {
    expect(formulaDe(aplicarLoEscrito(pedido(5, 'B', '6'))).params.constantes['agencia_pct']).toBe(
      0.06,
    )
    const f = formulaDe(aplicarLoEscrito(pedido(6, 'B', '3')))
    expect(f.params.constantes['seguro__1']).toBe(0.03)
    expect(nodo(f, 'seguro')).toMatchObject({ texto: '=PORCENTAJE_DE(fees; 3%)' })
    expect(aplicarLoEscrito(pedido(3, 'B', '3'))).toMatchObject({ tipo: 'error' })
  })
})

describe('aplicarLoEscrito: interruptor y variante', () => {
  it('un interruptor lee Sí/No y una variante su opción por etiqueta o clave', () => {
    const bandera = { id: 'urgente', tipo: 'bandera', etiqueta: 'Urgente' } as Nodo
    const opcion = {
      id: 'via',
      tipo: 'opcion',
      etiqueta: 'Vía',
      opciones: [
        { clave: 'mar', etiqueta: 'Marítima', titulo: 'Por mar' },
        { clave: 'aire', etiqueta: 'Aérea', titulo: 'Por aire' },
      ],
    } as Nodo
    const f = conNodoAntes(conNodoAntes(FORMULA_A1, bandera, 'tc'), opcion, 'tc')
    expect(aplicarLoEscrito(pedido(1, 'D', 'sí', f))).toMatchObject({
      cambio: { tipo: 'bandera', valor: true },
    })
    expect(aplicarLoEscrito(pedido(1, 'D', 'quizá', f))).toMatchObject({ tipo: 'error' })
    expect(aplicarLoEscrito(pedido(1, 'C', 'sí', f))).toMatchObject({
      error: { mensaje: MENSAJE_AL_COTIZAR_EN_C },
    })
    expect(aplicarLoEscrito(pedido(2, 'D', 'aerea', f))).toMatchObject({
      cambio: { tipo: 'variante', clave: 'aire' },
    })
    // La barra espaciadora: el interruptor se da vuelta y la variante pasa a la opción siguiente.
    expect(cambioAlAlternar(bandera, UNIDAD_EN_CEROS)).toEqual({
      tipo: 'bandera',
      id: 'urgente',
      valor: true,
    })
    const conAire = unidadConElCambio(UNIDAD_EN_CEROS, { tipo: 'variante', clave: 'aire' })
    expect(cambioAlAlternar(opcion, conAire)).toEqual({ tipo: 'variante', clave: 'mar' })
    expect(cambioAlAlternar(nodo(FORMULA_A1, 'fees') as Nodo, conAire)).toBeNull()
  })
})

describe('textoDeLaCelda', () => {
  const ctx = (textoConIds: string | null): ContextoDelTexto => ({
    formula: FORMULA_A1,
    hoja: hojaDeLaPlanilla(FORMULA_A1),
    unidad: { ...UNIDAD_EN_CEROS, inputs: { remate: 1500 } },
    locale: LOCALE,
    textoConIds,
    deDondeSale: 'el tipo de cambio oficial',
  })

  it('C de un cálculo abre su fórmula en A1; la de un valor fijo, su número; la del asesor, vacía', () => {
    expect(textoDeLaCelda(8, 'C', ctx('=cif+agencia'))).toEqual({ editable: true, texto: '=C7+C5' })
    expect(textoDeLaCelda(3, 'C', ctx(null))).toEqual({ editable: true, texto: '100' })
    expect(textoDeLaCelda(2, 'C', ctx(null))).toEqual({ editable: true, texto: '' })
  })

  it('Ejemplo abre la unidad en lo que escribe el asesor; en un valor fijo o un cálculo dice por qué no', () => {
    expect(textoDeLaCelda(2, 'D', ctx(null))).toEqual({ editable: true, texto: '1500' })
    expect(textoDeLaCelda(3, 'D', ctx(null))).toEqual({
      editable: false,
      motivo: 'El valor fijo se escribe en C3.',
    })
    expect(textoDeLaCelda(8, 'D', ctx(null))).toEqual({
      editable: false,
      motivo: MOTIVO_DEL_EJEMPLO,
    })
  })

  it('B abre el % en puntos; un tipo de cambio no se escribe', () => {
    expect(textoDeLaCelda(5, 'B', ctx(null))).toEqual({ editable: true, texto: '4' })
    expect(textoDeLaCelda(1, 'C', ctx(null))).toMatchObject({ editable: false })
    expect(textoDeLaCelda(3, 'B', ctx(null))).toMatchObject({ editable: false })
  })
})
