import { describe, expect, it } from 'vitest'
import { propsDeCelda, type ContextoDeHoja } from './binding'
import { propsDelPisado } from './binding-pisado'
import { ENTRADAS_VACIAS, indiceDeHoja, type Entradas } from './entradas'
import { hojaDesde, type HojaLista } from './hoja'
import { crudaDeLaHoja, respuestaDePrueba } from './hoja-de-prueba.soporte'
import { lista } from './hoja.soporte'
import { pisadasDeLaHoja } from './pisadas-de-la-hoja'

// Los «Decimales» de una celda (glosario) en la hoja de cotizar: la base los manda en cada lugar donde dibuja un nodo (`_hoja_decimales()`) y la hoja los lleva
// hasta la XCell, lo pisado y la tarjeta del total. Sin la clave, «Automático».

type Cruda = ReturnType<typeof crudaDeLaHoja>
type Objeto = Record<string, unknown>

const itemDe = (cruda: Cruda, nodo: string): Objeto => {
  const item = cruda.secciones[0]?.items.find((i) => 'nodo' in i && i.nodo === nodo)
  if (item === undefined) {
    throw new Error(`No hay el ítem ${nodo}`)
  }
  return item as Objeto
}

// La hoja de prueba con decimales: 0 en `fees` (un cálculo), 1 en su porcentaje, 3 en `iva_c` (una constante en %), 2 en el subtotal y 4 en el total.
const crudaConDecimales = (): Cruda => {
  const cruda = crudaDeLaHoja()
  const fees = itemDe(cruda, 'fees')
  fees['decimales'] = 0
  ;(fees['secundario'] as Objeto)['decimales'] = 1
  itemDe(cruda, 'iva_c')['decimales'] = 3
  itemDe(cruda, 'cif')['decimales'] = 2
  ;(cruda.tarjeta_total as Objeto)['decimales'] = 4
  ;(cruda.tarjeta_total.secundarios[0] as Objeto)['decimales'] = 0
  return cruda
}

const leida = (cruda: unknown): HojaLista => {
  const hoja = hojaDesde(cruda)
  if (hoja?.estado !== 'lista') {
    throw new Error('La hoja de prueba no se leyó.')
  }
  return hoja
}

const con = (overrides: Record<string, number>): Entradas => ({
  ...ENTRADAS_VACIAS,
  overrides: new Map(Object.entries(overrides)),
})

describe('hojaDesde: los «Decimales» de cada celda', () => {
  it('los lee en la celda, su secundario, el subtotal, el total y la tarjeta del total; sin la clave, ninguna', () => {
    const hoja = leida(crudaConDecimales())
    const items = hoja.secciones[0]?.items ?? []
    const porNodo = new Map(items.map((i) => [i.nodo, i]))
    expect(porNodo.get('fees')).toMatchObject({ decimales: 0, secundario: { decimales: 1 } })
    expect(porNodo.get('iva_c')).toMatchObject({ decimales: 3 })
    expect(porNodo.get('cif')).toMatchObject({ tipo: 'subtotal', decimales: 2 })
    expect(porNodo.get('remate')).not.toHaveProperty('decimales')
    expect(hoja.tarjetaTotal).toMatchObject({ decimales: 4, secundarios: [{ decimales: 0 }] })
    expect(leida(crudaDeLaHoja()).tarjetaTotal).not.toHaveProperty('decimales')

    const conTotal = lista()
    conTotal.secciones[0]?.items.push({
      tipo: 'total',
      nodo: 'total',
      etiqueta: 'TOTAL',
      formato: 'usd',
      decimales: 1,
    } as never)
    const total = (hojaDesde(conTotal) as HojaLista).secciones[0]?.items.at(-1)
    expect(total).toMatchObject({ tipo: 'total', decimales: 1 })
  })

  it('una cifra que la base no promete (fuera de 0 a 4 o con coma) no abre la hoja', () => {
    for (const decimales of [5, -1, 2.5, '2']) {
      const cruda = crudaDeLaHoja()
      itemDe(cruda, 'fees')['decimales'] = decimales
      expect(hojaDesde(cruda), `celda con ${String(decimales)}`).toBeNull()
      const otra = crudaDeLaHoja()
      ;(otra.tarjeta_total as Objeto)['decimales'] = decimales
      expect(hojaDesde(otra), `tarjeta con ${String(decimales)}`).toBeNull()
    }
  })
})

describe('los «Decimales» hasta la XCell', () => {
  const hoja = leida(crudaConDecimales())
  const indice = indiceDeHoja(hoja.secciones)
  const celda = (nodo: string) => {
    const c = indice.celdas.get(nodo)
    if (!c) {
      throw new Error(`No hay la celda ${nodo}`)
    }
    return c
  }
  const contexto = (entradas: Entradas = ENTRADAS_VACIAS): ContextoDeHoja => ({
    indice,
    entradas,
    respuesta: respuestaDePrueba({
      valores: { fees: 480, fees_pct: 0.05 },
      calculados: { fees: 480 },
    }),
  })

  it('la celda y su secundario llevan los suyos; sin ellos, «Automático» (undefined)', () => {
    expect(propsDeCelda(celda('fees'), contexto())).toMatchObject({
      decimals: 0,
      secondaryDecimals: 1,
    })
    expect(propsDeCelda(celda('iva_c'), contexto())).toMatchObject({
      decimals: 3,
      secondaryDecimals: undefined,
    })
    expect(propsDeCelda(celda('remate'), contexto()).decimals).toBeUndefined()
  })

  it('«Calculado» va con los decimales del lado pisado, y la lista de lo pisado también', () => {
    expect(propsDelPisado(celda('fees'), con({ fees: 500 }), null).calculatedDecimals).toBe(0)
    expect(propsDelPisado(celda('fees'), ENTRADAS_VACIAS, null).calculatedDecimals).toBeUndefined()
    expect(pisadasDeLaHoja(contexto(con({ fees: 500 })))).toEqual([
      { nodo: 'fees', etiqueta: 'FEES', valor: 500, calculado: 480, formato: 'usd', decimales: 0 },
    ])

    // Con el porcentaje como un cálculo, el lado pisado es el secundario: sus decimales.
    const cruda = crudaConDecimales()
    ;(itemDe(cruda, 'fees')['secundario'] as Objeto)['tipo_nodo'] = 'calculo'
    const fees = indiceDeHoja(leida(cruda).secciones).celdas.get('fees')
    expect(fees && propsDelPisado(fees, con({ fees_pct: 0.06 }), null).calculatedDecimals).toBe(1)
  })
})
