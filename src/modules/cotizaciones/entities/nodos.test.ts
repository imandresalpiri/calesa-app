import { describe, expect, it } from 'vitest'
import {
  aceptaValor,
  bucketDe,
  condicionDe,
  daMonto,
  esCondicion,
  esMonto,
  esPisable,
  esquemaNodo,
  formatoDe,
  sobrescribibleDe,
  soloEnDe,
  type Nodo,
} from './nodos'
import { CASOS, nodo } from './nodos.soporte'

describe('esquemaNodo', () => {
  it('rechaza una clave mal escrita, un tipo o una operación que no existen y la aridad', () => {
    const malos = [
      { id: 'a', tipo: 'input', solo_em: ['x'] },
      { id: 'a', tipo: 'formula' },
      { id: 'a', tipo: 'calculo', op: 'potencia', de: ['b'] },
      { id: 'a', tipo: 'calculo', op: 'dividir', de: ['b', 'c', 'd'] },
      { id: 'a', tipo: 'calculo', op: 'porcentaje_de', de: ['b'] },
      { id: 'A', tipo: 'input' },
      { id: 'a', tipo: 'tipo_cambio', clave: 'oficial', solo_en: ['x'] },
      { id: 'a', tipo: 'input', sobrescribible: true },
      { id: 'tablas', tipo: 'constante' },
      { id: 'a', tipo: 'calculo', op: 'comparar', de: ['b', 'c'], cmp: '=>' },
      { id: 'a', tipo: 'calculo', op: 'comparar', de: ['b', 'c', 'd'], cmp: '>' },
      { id: 'a', tipo: 'calculo', op: 'es_opcion', de: ['v'], cmp: '>', clave: 'x' },
      { id: 'a', tipo: 'calculo', op: 'es_opcion', de: ['v'], cmp: '=', clave: 'X' },
      { id: 'a', tipo: 'calculo', op: 'y', de: ['b'] },
      { id: 'a', tipo: 'calculo', op: 'elegir', de: ['b', 'c', 'd'], prueba: 'p' },
      { id: 'a', tipo: 'calculo', op: 'elegir', de: ['b'] },
      { id: 'a', tipo: 'calculo', op: 'max', de: [] },
    ]
    for (const m of malos)
      expect(esquemaNodo.safeParse({ etiqueta: 'X', ...m }).success).toBe(false)
  })

  it('los decimales: un entero de 0 a 4 o ninguno; lo demás cae en `decimales`, y un formato malo se nombra antes', () => {
    for (const d of [0, 1, 2, 3, 4])
      expect(
        esquemaNodo.safeParse({ id: 'a', tipo: 'input', etiqueta: 'X', decimales: d }).success,
      ).toBe(true)
    for (const d of [5, -1, 2.5, 1e9, '2', null, true]) {
      const r = esquemaNodo.safeParse({ id: 'a', tipo: 'input', etiqueta: 'X', decimales: d })
      expect(r.success, String(d)).toBe(false)
      expect(r.error?.issues[0]?.path, String(d)).toEqual(['decimales'])
    }
    const dos = esquemaNodo.safeParse({
      id: 'a',
      tipo: 'input',
      etiqueta: 'X',
      formato: 'eur',
      decimales: 9,
    })
    expect(dos.error?.issues[0]?.path).toEqual(['formato'])
  })

  it('no le pone el formato por defecto a lo que lee: lo guardado no cambia', () => {
    expect(nodo({ id: 'a', tipo: 'input' })).not.toHaveProperty('formato')
  })
})

describe('lo que se lee de un nodo', () => {
  it('formatoDe vale usd sin formato, como el coalesce de la base, y esMonto mira usd y moneda', () => {
    expect(formatoDe({})).toBe('usd')
    expect(formatoDe({ formato: 'pct' })).toBe('pct')
    expect([
      esMonto({}),
      esMonto({ formato: 'moneda' }),
      esMonto({ formato: 'pct' }),
      esMonto({ formato: 'raw' }),
    ]).toEqual([true, true, false, false])
  })

  it('daMonto: sólo input, constante, tabla, tramo y calculo dan un monto, aunque los demás digan usd', () => {
    const sinMonto = new Set(['tipo_cambio', 'campo_vehiculo', 'bandera', 'opcion'])
    for (const [nombre, crudo] of CASOS)
      expect(daMonto(nodo(crudo)), nombre).toBe(!sinMonto.has(nombre))
  })

  it('aceptaValor: el input, la constante y el tipo de cambio siempre; tabla, tramo y cálculo si son sobrescribibles', () => {
    const siempre = new Set(['input', 'constante', 'tipo_cambio'])
    for (const [nombre, crudo] of CASOS) {
      expect(aceptaValor(nodo(crudo)), nombre).toBe(siempre.has(nombre))
      if (['tabla', 'tramo'].includes(nombre) || crudo['tipo'] === 'calculo') {
        const sobrescribible = nodo({ ...crudo, sobrescribible: true })
        expect(aceptaValor(sobrescribible), `${nombre} sobrescribible`).toBe(true)
      }
    }
  })

  it('esPisable: tabla, tramo y cálculo que no son el total, sobrescribibles o no; lo demás nunca', () => {
    const pisables = new Set(['tabla', 'tramo'])
    for (const [nombre, crudo] of CASOS) {
      const esperado = pisables.has(nombre) || crudo['tipo'] === 'calculo'
      expect(esPisable(nodo(crudo)), nombre).toBe(esperado)
      if (esperado) {
        expect(
          esPisable(nodo({ ...crudo, sobrescribible: true })),
          `${nombre} sobrescribible`,
        ).toBe(true)
      }
    }
    const total = { id: 't', tipo: 'calculo', op: 'suma', de: ['a'], salida: 'total', bucket: 'x' }
    expect(esPisable(nodo(total))).toBe(false)
  })

  it('bucketDe trata «ninguno» como sin bucket', () => {
    expect([bucketDe({}), bucketDe({ bucket: 'ninguno' }), bucketDe({ bucket: 'origen' })]).toEqual(
      [undefined, undefined, 'origen'],
    )
  })

  it('soloEnDe, condicionDe y sobrescribibleDe sólo lo dan los tipos que lo admiten', () => {
    const tc = nodo({ id: 'a', tipo: 'tipo_cambio', clave: 'oficial' })
    const tabla = nodo({
      id: 'a',
      tipo: 'tabla',
      tabla: 't',
      match: {},
      columna: 'c',
      solo_en: ['x'],
      condicion: 'd',
      sobrescribible: true,
    })
    const input = nodo({ id: 'a', tipo: 'input' })
    expect([soloEnDe(tc), condicionDe(tc), sobrescribibleDe(tc)]).toEqual([
      undefined,
      undefined,
      false,
    ])
    expect([soloEnDe(tabla), condicionDe(tabla), sobrescribibleDe(tabla)]).toEqual([
      ['x'],
      'd',
      true,
    ])
    expect(sobrescribibleDe(input)).toBe(false)
  })
})

describe('esCondicion', () => {
  it('una bandera y las operaciones que valen 1 o 0 sirven de condición; un número o un SI, no', () => {
    const si = ['bandera', 'comparar', 'es_opcion', 'y', 'o']
    const no = [
      'input',
      'constante',
      'tramo',
      'opcion',
      'suma',
      'si',
      'depreciar',
      'elegir',
      'max',
      'min',
    ]
    const porNombre = new Map(CASOS.map(([nombre, crudo]) => [nombre, nodo(crudo)]))
    for (const nombre of si) expect(esCondicion(porNombre.get(nombre) as Nodo), nombre).toBe(true)
    for (const nombre of no) expect(esCondicion(porNombre.get(nombre) as Nodo), nombre).toBe(false)
  })
})
