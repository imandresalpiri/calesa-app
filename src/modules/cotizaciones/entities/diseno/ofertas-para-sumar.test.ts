import { describe, expect, it } from 'vitest'
import { MAXIMO_DE_ITEMS_DEL_DISENO } from '../diseno'
import { esquemaDefinicion } from '../formula'
import { celda, disenoDe, formulaDePrueba, seccion } from './diseno-de-prueba.soporte'
import { MOTIVO_DEL_TOPE_DE_PIEZAS } from './insercion-del-diseno'
import { itemParaSumar, ofertasParaSumar } from './ofertas-para-sumar'
import { MOTIVO_DEL_TOTAL_EN_AVANZADO, MOTIVO_DEL_TOTAL_REPETIDO } from './total-de-la-hoja'

const PRINCIPAL = { presentacion: 'principal' } as const
const nodosDe = (o: { candidatos: { nodo: string }[] } | undefined) =>
  o?.candidatos.map((c) => c.nodo)

const conTabla = esquemaDefinicion.parse({
  nodos: [
    { id: 'a', tipo: 'input', etiqueta: 'A' },
    { id: 'urgente', tipo: 'bandera', etiqueta: 'Urgente' },
    {
      id: 'flete',
      tipo: 'tabla',
      etiqueta: 'Flete',
      tabla: 'fletes',
      match: { marca: 'marca' },
      columna: 'monto',
      sobrescribible: true,
    },
    { id: 'tasa', tipo: 'constante', etiqueta: 'Tasa', formato: 'pct' },
    {
      id: 'comision',
      tipo: 'calculo',
      op: 'porcentaje_de',
      de: ['a'],
      pct: 'tasa',
      etiqueta: 'Comisión',
      sobrescribible: true,
    },
    {
      id: 'total',
      tipo: 'calculo',
      op: 'suma',
      de: ['a', 'flete'],
      etiqueta: 'Total',
      salida: 'total',
    },
  ],
})

describe('lo que ofrece el «+» de una sección', () => {
  it('cada tipo con las filas que puede dibujar y no están en la hoja', () => {
    const d = disenoDe([seccion('s', [celda('a'), celda('b')])])
    const [celdas, variante, atajos, interruptor, subtotal, total] = ofertasParaSumar(
      formulaDePrueba,
      d,
      PRINCIPAL,
    )
    expect(nodosDe(celdas)).toEqual(['c', 'libre', 'tasa', 'comision', 'neto', 'total'])
    expect(nodosDe(variante)).toEqual(['variante'])
    expect(atajos?.motivo).toMatch(/tabla/)
    expect(interruptor?.motivo).toMatch(/bandera/)
    expect(nodosDe(subtotal)).toEqual(['comision', 'neto', 'total'])
    expect(total).toEqual({
      tipo: 'total',
      etiqueta: 'Tarjeta del total',
      candidatos: [],
      motivo: null,
    })
  })

  it('los atajos, de una tabla sobrescribible con celda y sin atajos', () => {
    const sinCelda = disenoDe([seccion('s', [celda('a')])])
    expect(nodosDe(ofertasParaSumar(conTabla, sinCelda, PRINCIPAL)[2])).toEqual([])
    const conCelda = disenoDe([seccion('s', [celda('flete')])])
    expect(nodosDe(ofertasParaSumar(conTabla, conCelda, PRINCIPAL)[2])).toEqual(['flete'])
    expect(nodosDe(ofertasParaSumar(conTabla, conCelda, PRINCIPAL)[3])).toEqual(['urgente'])
  })

  it('la tarjeta del total, con su motivo si ya está o la sección no la admite', () => {
    const d = disenoDe([seccion('s', [celda('a')])])
    expect(ofertasParaSumar(formulaDePrueba, d, { presentacion: 'avanzado' })[5]?.motivo).toBe(
      MOTIVO_DEL_TOTAL_EN_AVANZADO,
    )
    const ubicado = disenoDe([seccion('s', [celda('a'), { tipo: 'total' }])])
    expect(ofertasParaSumar(formulaDePrueba, ubicado, PRINCIPAL)[5]?.motivo).toBe(
      MOTIVO_DEL_TOTAL_REPETIDO,
    )
  })

  it('en el tope de piezas nada se ofrece', () => {
    const lleno = disenoDe([
      seccion(
        's',
        Array.from({ length: MAXIMO_DE_ITEMS_DEL_DISENO }, () => celda('a')),
      ),
    ])
    for (const o of ofertasParaSumar(formulaDePrueba, lleno, PRINCIPAL))
      expect(o.motivo).toBe(MOTIVO_DEL_TOPE_DE_PIEZAS)
  })
})

describe('la pieza que se suma', () => {
  it('lleva lo que la base pide de cada tipo', () => {
    expect(itemParaSumar(conTabla, 'celda', 'a')).toEqual({ tipo: 'celda', nodo: 'a', ancho: 6 })
    expect(itemParaSumar(conTabla, 'celda', 'comision')).toEqual({
      tipo: 'celda',
      nodo: 'comision',
      ancho: 6,
      secundario: 'porcentaje',
    })
    expect(itemParaSumar(conTabla, 'atajos', 'flete')).toEqual({
      tipo: 'atajos',
      nodo: 'flete',
      columna: 'marca',
      filas: 5,
    })
    expect(itemParaSumar(conTabla, 'interruptor', 'urgente')).toEqual({
      tipo: 'interruptor',
      nodo: 'urgente',
      efecto: 'habilita',
    })
    expect(itemParaSumar(conTabla, 'subtotal', 'total')).toEqual({
      tipo: 'subtotal',
      nodo: 'total',
    })
    expect(itemParaSumar(conTabla, 'total', '')).toEqual({ tipo: 'total' })
  })
})
