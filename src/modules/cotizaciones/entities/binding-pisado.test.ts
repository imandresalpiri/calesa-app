import { describe, expect, it } from 'vitest'
import { propsDeCelda, type ContextoDeHoja } from './binding'
import {
  calculadoDe,
  esCalculo,
  esPisadoNuevo,
  hayPisadas,
  ladoPisado,
  propsDelPisado,
} from './binding-pisado'
import { ENTRADAS_VACIAS, indiceDeHoja, type Entradas } from './entradas'
import { hojaDesde, type HojaLista } from './hoja'
import { crudaDeLaHoja, hojaDePrueba, respuestaDePrueba } from './hoja-de-prueba.soporte'
import type { RespuestaDeRecalculo } from './recalculo'

// Lo escrito sobre un cálculo (`docs/COTIZADOR.md` › «Pisar un cálculo»): `fees` es un cálculo con su porcentaje constante, `factor` una tabla, `iva_c` una
// constante y `transferencia` un cálculo con candado cuyo porcentaje (constante) se escribe.
const indice = indiceDeHoja(hojaDePrueba().secciones)
const celda = (nodo: string, i = indice) => {
  const c = i.celdas.get(nodo)
  if (!c) {
    throw new Error(`No hay la celda ${nodo}`)
  }
  return c
}
const con = (overrides: Record<string, number>, inputs: Record<string, number> = {}): Entradas => ({
  ...ENTRADAS_VACIAS,
  overrides: new Map(Object.entries(overrides)),
  inputs: new Map(Object.entries(inputs)),
})
const contexto = (entradas: Entradas, respuesta: RespuestaDeRecalculo | null): ContextoDeHoja => ({
  indice,
  entradas,
  respuesta,
})

// La hoja con el porcentaje de `fees` como un cálculo: el lado pisado es el secundario.
const indiceConElPorcentajeCalculado = () => {
  const cruda = crudaDeLaHoja()
  const items = cruda.secciones[0]?.items ?? []
  const fees = items.find((i) => 'nodo' in i && i.nodo === 'fees') as Record<string, unknown>
  ;(fees['secundario'] as Record<string, unknown>)['tipo_nodo'] = 'calculo'
  return indiceDeHoja((hojaDesde(cruda) as HojaLista).secciones)
}

describe('qué es un cálculo pisado', () => {
  it('una tabla, un tramo o un cálculo; una constante, un dato o un tipo de cambio no', () => {
    expect(['tabla', 'tramo', 'calculo'].map((t) => esCalculo(t as never))).toEqual([
      true,
      true,
      true,
    ])
    expect(['constante', 'input', 'tipo_cambio'].map((t) => esCalculo(t as never))).toEqual([
      false,
      false,
      false,
    ])
  })

  it('el lado pisado: el principal escrito; el secundario sólo si es un cálculo; una constante escrita no', () => {
    expect(ladoPisado(celda('fees'), new Map([['fees', 500]]))).toEqual({
      nodo: 'fees',
      formato: 'usd',
    })
    expect(ladoPisado(celda('fees'), new Map([['fees_pct', 0.04]]))).toBeNull()
    expect(ladoPisado(celda('iva_c'), new Map([['iva_c', 0.2]]))).toBeNull()
    const otro = indiceConElPorcentajeCalculado()
    expect(ladoPisado(celda('fees', otro), new Map([['fees_pct', 0.04]]))).toEqual({
      nodo: 'fees_pct',
      formato: 'pct',
    })
    // Con los dos escritos, el monto: el porcentaje lo escribe el par.
    expect(
      ladoPisado(
        celda('fees', otro),
        new Map([
          ['fees', 500],
          ['fees_pct', 0.04],
        ]),
      )?.nodo,
    ).toBe('fees')
  })

  it('lo calculado sale de la respuesta: la cifra, nulo si le falta un dato y nada si no llegó (nunca una vieja)', () => {
    const r = respuestaDePrueba({ calculados: { fees: 480, factor: null } })
    expect(calculadoDe('fees', r)).toBe(480)
    expect(calculadoDe('factor', r)).toBeNull()
    expect(calculadoDe('seguro', r)).toBeUndefined()
    expect(calculadoDe('fees', null)).toBeUndefined()
  })
})

describe('lo que la celda dibuja de lo pisado', () => {
  it('pisado y calculado: la marca, «Calculado» en dólares, el anillo y ↺ al calculado (sin valor por defecto)', () => {
    const c = contexto(con({ fees: 500 }), respuestaDePrueba({ calculados: { fees: 480 } }))
    expect(propsDeCelda(celda('fees'), c)).toMatchObject({
      value: 500,
      overridden: true,
      handEdited: true,
      calculatedValue: 480,
      calculatedFormat: 'monto',
      defaultValue: undefined,
    })
  })

  it('una tabla pisada dice lo calculado en su formato; sin la respuesta, sólo la marca', () => {
    const tabla = propsDelPisado(
      celda('factor'),
      con({ factor: 0.5 }),
      respuestaDePrueba({ calculados: { factor: 0.328 } }),
    )
    expect(tabla).toEqual({ handEdited: true, calculatedValue: 0.328, calculatedFormat: 'numero' })
    expect(propsDelPisado(celda('factor'), con({ factor: 0.5 }), null)).toEqual({
      handEdited: true,
      calculatedValue: undefined,
      calculatedFormat: 'numero',
    })
  })

  it('sin pisar, o con una constante escrita, ni marca ni «Calculado»: la constante vuelve al valor por defecto', () => {
    const r = respuestaDePrueba({ calculados: { fees: 480 } })
    expect(propsDeCelda(celda('fees'), contexto(ENTRADAS_VACIAS, r))).toMatchObject({
      handEdited: false,
      calculatedValue: undefined,
    })
    expect(propsDeCelda(celda('iva_c'), contexto(con({ iva_c: 0.2 }), r))).toMatchObject({
      handEdited: false,
      overridden: true,
      defaultValue: null,
    })
  })
})

describe('el porcentaje de un par con el monto escrito', () => {
  it('con `sigueAlMonto` lo da la respuesta, no lo tipeado antes', () => {
    const r = respuestaDePrueba({ valores: { fees: 500, fees_pct: 0.05, seguro_pct: 0.04 } })
    const fees = propsDeCelda(celda('fees'), contexto(con({ fees: 500, fees_pct: 0.03 }), r))
    expect(fees.secondaryValue).toBe(0.05)
    const seguro = propsDeCelda(
      celda('seguro'),
      contexto(con({ seguro: 80 }, { seguro_pct: 0.02 }), r),
    )
    expect(seguro.secondaryValue).toBe(0.04)
  })

  it('sin el monto escrito, o sin `sigueAlMonto`, lo tipeado manda mientras la respuesta no llega', () => {
    const r = respuestaDePrueba({ valores: { fees_pct: 0.05, transf_pct: 0.05 } })
    const fees = propsDeCelda(celda('fees'), contexto(con({ fees_pct: 0.03 }), r))
    expect(fees.secondaryValue).toBe(0.03)
    const transferencia = propsDeCelda(
      celda('transferencia'),
      contexto(con({ transferencia: 9, transf_pct: 0.03 }), r),
    )
    expect(transferencia.secondaryValue).toBe(0.03)
  })
})

describe('el aviso de la primera vez y la lista del resumen', () => {
  it('pisa uno nuevo lo escrito sobre un cálculo sin pisar; vaciar, volver a escribir o una constante no', () => {
    expect(esPisadoNuevo(indice, ENTRADAS_VACIAS, 'fees', 500)).toBe(true)
    expect(esPisadoNuevo(indice, ENTRADAS_VACIAS, 'factor', 0.5)).toBe(true)
    expect(esPisadoNuevo(indice, con({ fees: 500 }), 'fees', 510)).toBe(false)
    expect(esPisadoNuevo(indice, ENTRADAS_VACIAS, 'fees', null)).toBe(false)
    expect(esPisadoNuevo(indice, ENTRADAS_VACIAS, 'fees_pct', 0.04)).toBe(false)
    expect(esPisadoNuevo(indice, ENTRADAS_VACIAS, 'iva_c', 0.2)).toBe(false)
    expect(esPisadoNuevo(indice, ENTRADAS_VACIAS, 'no_existe', 1)).toBe(false)
    expect(esPisadoNuevo(indiceConElPorcentajeCalculado(), ENTRADAS_VACIAS, 'fees_pct', 0.04)).toBe(
      true,
    )
  })

  it('hay pisadas sólo con algo escrito sobre un cálculo', () => {
    expect(hayPisadas(indice, ENTRADAS_VACIAS)).toBe(false)
    expect(hayPisadas(indice, con({ iva_c: 0.2, fees_pct: 0.04 }))).toBe(false)
    expect(hayPisadas(indice, con({ iva_c: 0.2, factor: 0.5 }))).toBe(true)
  })
})
