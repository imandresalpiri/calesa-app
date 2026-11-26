import { describe, expect, it } from 'vitest'
import { aplicarLoEscrito } from './escrito-en-la-celda'
import { FORMULA_A1 } from './hoja-a1.soporte'
import { hojaDeLaPlanilla } from './hoja-de-la-planilla'
import {
  insertarOperacion,
  OPERACIONES_RAPIDAS,
  podarLugares,
  saltoTrasReferencia,
  siguienteLugar,
  type TextoConLugares,
} from './operaciones-rapidas'
import { insertarReferencia } from './referencias-tipeadas'

// Tipea `valor` en el cursor y pasa al siguiente lugar, como Tab.
function llenar(e: TextoConLugares, valores: readonly string[]): string {
  let { texto, cursor, lugares } = e
  for (const [i, valor] of valores.entries()) {
    texto = texto.slice(0, cursor) + valor + texto.slice(cursor)
    cursor += valor.length
    lugares = podarLugares(texto, cursor, lugares)
    if (i === valores.length - 1) break
    const s = siguienteLugar(texto, cursor, lugares)
    if (s === null) throw new Error(`no queda lugar tras «${texto}»`)
    ;({ cursor, lugares } = s)
  }
  return texto
}

describe('insertarOperacion', () => {
  it('con el texto vacío: la forma con «=», el cursor en el primer lugar y los demás como distancia al final', () => {
    expect(insertarOperacion('', 0, 'sumar')).toEqual({ texto: '=+', cursor: 1, lugares: [0] })
    expect(insertarOperacion('', 0, 'porcentaje')).toEqual({
      texto: '=PORCENTAJE_DE(; %)',
      cursor: 15,
      lugares: [2],
    })
    expect(insertarOperacion('', 0, 'si')).toEqual({
      texto: '=SI(; ; )',
      cursor: 4,
      lugares: [3, 1],
    })
  })

  it('sin «=», lo escrito va a su lugar (con «%» si es en puntos)', () => {
    expect(insertarOperacion('100', 3, 'sumar')).toEqual({ texto: '=100+', cursor: 5, lugares: [] })
    expect(insertarOperacion('10', 2, 'porcentaje', true)).toMatchObject({
      texto: '=PORCENTAJE_DE(10%; %)',
      cursor: 20,
    })
    expect(insertarOperacion('100', 3, 'si')).toEqual({
      texto: '=SI(; 100; )',
      cursor: 4,
      lugares: [1],
    })
  })

  it('con una fórmula, la forma sin «=» va en el cursor; un lugar pegado a un operando ya está lleno', () => {
    expect(insertarOperacion('=C5', 3, 'sumar')).toEqual({ texto: '=C5+', cursor: 4, lugares: [] })
    expect(insertarOperacion('=C2*', 4, 'si')).toEqual({
      texto: '=C2*SI(; ; )',
      cursor: 7,
      lugares: [3, 1],
    })
    // Nunca antes del «=».
    expect(insertarOperacion('=C5', 0, 'porcentaje').texto).toBe('=PORCENTAJE_DE(; %)C5')
  })

  it('cada forma completada compila sobre la hoja de prueba', () => {
    const hoja = hojaDeLaPlanilla(FORMULA_A1)
    const casos = [
      { clave: 'sumar', valores: ['C5', 'C7'], texto: '=C5+C7' },
      { clave: 'porcentaje', valores: ['C5', '4'], texto: '=PORCENTAJE_DE(C5; 4%)' },
      { clave: 'si', valores: ['C3>0', 'C5', '0'], texto: '=SI(C3>0; C5; 0)' },
    ] as const
    for (const c of casos) {
      const texto = llenar(insertarOperacion('', 0, c.clave), c.valores)
      expect(texto).toBe(c.texto)
      const r = aplicarLoEscrito({
        formula: FORMULA_A1,
        hoja,
        numero: 8,
        col: 'C',
        texto,
        locale: 'es-BO',
        tablas: null,
      })
      expect(r.tipo, texto).toBe('formula')
    }
  })

  it('las tres, con su etiqueta', () => {
    expect(OPERACIONES_RAPIDAS.map((o) => o.etiqueta)).toEqual([
      'Sumar',
      'Porcentaje de',
      'Si… entonces…',
    ])
  })
})

describe('los lugares por llenar', () => {
  it('siguienteLugar lleva al próximo; sin lugares, nulo', () => {
    expect(siguienteLugar('=SI(C3; ; )', 6, [3, 1])).toEqual({ cursor: 8, lugares: [1] })
    expect(siguienteLugar('=SI(C3; C5; )', 10, [1])).toEqual({ cursor: 12, lugares: [] })
    expect(siguienteLugar('=C5+C7', 6, [])).toBeNull()
  })

  it('podarLugares quita los que quedaron antes del cursor o fuera del texto', () => {
    expect(podarLugares('=SI(; ; )', 4, [3, 1])).toEqual([3, 1])
    expect(podarLugares('=SI(; ; )', 7, [3, 1])).toEqual([1])
    expect(podarLugares('=S', 1, [3])).toEqual([])
  })

  it('tras tocar una celda en Sumar, salta el «+»: el segundo toque no reemplaza la referencia', () => {
    const r = insertarOperacion('', 0, 'sumar')
    const primera = insertarReferencia({ ...r, ultima: null }, 'C5', false)
    expect(primera).toMatchObject({ texto: '=C5+', cursor: 3 })
    if (primera === null) return
    const salto = saltoTrasReferencia(primera.texto, primera.cursor, r.lugares)
    expect(salto).toEqual({ cursor: 4, lugares: [] })
    if (salto === null) return
    expect(insertarReferencia({ ...primera, ...salto }, 'C7', false)?.texto).toBe('=C5+C7')
  })

  it('no salta si hay más que un operador hasta el lugar', () => {
    expect(saltoTrasReferencia('=SI(C3; ; )', 6, [3, 1])).toBeNull()
    expect(saltoTrasReferencia('=C5+C7', 3, [])).toBeNull()
  })
})
