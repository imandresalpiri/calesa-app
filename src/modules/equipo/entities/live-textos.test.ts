import { describe, expect, it } from 'vitest'
import {
  etiquetaDeLoHeredado,
  filasDelRol,
  opcionDelValor,
  opcionesDelCampo,
  resumenDeLaPersona,
  textoDelValor,
} from './live-textos'
import { AJUSTES_POR_DEFECTO_DEL_LIVE, CAMPOS_DEL_LIVE } from './live'

const A = '00000000-0000-4000-8000-0000000000c1'
const B = '00000000-0000-4000-8000-0000000000c2'
const C = '00000000-0000-4000-8000-0000000000c3'
const D = '00000000-0000-4000-8000-0000000000c4'
const E = '00000000-0000-4000-8000-0000000000c5'
const ORIGENES = [
  { id: A, nombre: 'USA', activo: true },
  { id: B, nombre: 'China', activo: true },
  { id: C, nombre: 'Japón', activo: true },
  { id: D, nombre: 'Corea', activo: true },
  { id: E, nombre: 'Chile', activo: false },
]

describe('las filas de la tarjeta del rol', () => {
  it('un rol sin fila se ve con lo por defecto, campo por campo y en su orden', () => {
    const filas = filasDelRol(null, ORIGENES)
    expect(filas.map((f) => f.campo)).toEqual([...CAMPOS_DEL_LIVE])
    expect(filas.map((f) => [f.etiqueta, f.valor])).toEqual([
      ['Puede encender el Modo Live', 'Sí'],
      ['Vehículos', 'Encendido'],
      ['Orígenes', 'Todos los orígenes activos'],
      ['Cotizaciones', 'Encendido'],
      ['Clientes', 'Apagado'],
      ['Logística', 'Apagado'],
      ['Repuestos', 'Apagado'],
      ['Inicio y Tablero', 'Apagado'],
      ['Configuración de orígenes', 'Apagado'],
    ])
  })

  it('lo que el rol pisa se lee con su opción', () => {
    const filas = filasDelRol(
      { puedeEncender: false, clientes: 'nombres', logistica: 'cadena', origenesConfig: 'lectura' },
      ORIGENES,
    )
    const valor = (campo: string) => filas.find((f) => f.campo === campo)?.valor
    expect(valor('puedeEncender')).toBe('No')
    expect(valor('clientes')).toBe('Sólo nombres')
    expect(valor('logistica')).toBe('Sólo la cadena')
    expect(valor('origenesConfig')).toBe('Sólo lectura')
    expect(valor('repuestos')).toBe('Apagado')
  })
})

describe('los orígenes en texto', () => {
  const conOrigenes = (origenes: readonly string[]) =>
    textoDelValor('origenes', { ...AJUSTES_POR_DEFECTO_DEL_LIVE, origenes }, ORIGENES)

  it('por nombre, en el orden de la lista de orígenes', () => {
    expect(conOrigenes([B, A])).toBe('USA y China')
    expect(conOrigenes([C])).toBe('Japón')
    expect(conOrigenes([C, A, B])).toBe('USA, China y Japón')
  })

  it('con más de tres, los tres primeros y cuántos más; un inactivo se nombra', () => {
    expect(conOrigenes([A, B, C, D, E])).toBe('USA, China, Japón y 2 más')
  })

  it('un id que ya no está no se nombra', () => {
    expect(conOrigenes(['00000000-0000-4000-8000-0000000000ff'])).toBe('Ninguno de los que hay')
  })
})

describe('las opciones de cada campo', () => {
  it('todo valor por defecto es una de sus opciones', () => {
    for (const campo of CAMPOS_DEL_LIVE) {
      const opcion = opcionDelValor(campo, AJUSTES_POR_DEFECTO_DEL_LIVE[campo])
      expect(opcionesDelCampo(campo).map((o) => o.valor)).toContain(opcion)
    }
  })

  it('«Orígenes» es «todos» o «estos»', () => {
    expect(opcionDelValor('origenes', 'todos')).toBe('todos')
    expect(opcionDelValor('origenes', [A])).toBe('estos')
  })
})

describe('resumenDeLaPersona', () => {
  const rol = { id: A, nombre: 'Ventas', ajustes: null }

  it('sin lo propio, como su rol o, sin rol, por defecto', () => {
    expect(resumenDeLaPersona({ rol, ajustes: null })).toBe('Como su rol (Ventas)')
    expect(resumenDeLaPersona({ rol: null, ajustes: null })).toBe('Por defecto (sin rol)')
  })

  it('con lo propio, en cuántos campos', () => {
    expect(resumenDeLaPersona({ rol, ajustes: { inicio: true } })).toBe('Ajuste propio en 1 campo')
    expect(resumenDeLaPersona({ rol: null, ajustes: { inicio: true, clientes: 'nombres' } })).toBe(
      'Ajuste propio en 2 campos',
    )
  })
})

describe('etiquetaDeLoHeredado', () => {
  it('dice el valor de su rol, combinado con lo por defecto', () => {
    const persona = { rol: { id: A, nombre: 'Ventas', ajustes: { clientes: 'nombres' as const } } }
    expect(etiquetaDeLoHeredado('clientes', persona, ORIGENES)).toBe('Como su rol (Sólo nombres)')
    expect(etiquetaDeLoHeredado('logistica', persona, ORIGENES)).toBe('Como su rol (Apagado)')
  })

  it('sin rol, lo por defecto', () => {
    expect(etiquetaDeLoHeredado('origenes', { rol: null }, ORIGENES)).toBe(
      'Por defecto (Todos los orígenes activos)',
    )
  })
})
