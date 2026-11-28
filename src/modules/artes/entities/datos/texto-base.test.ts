import { describe, expect, it } from 'vitest'
import { catalogoDe } from './datos-de-prueba.soporte'
import {
  LARGO_MAXIMO_DEL_TEXTO_BASE,
  motivoDeLasVariables,
  normalizarTextoBase,
  validarTextoBase,
} from './texto-base'

const subasta = catalogoDe('subasta')
const manual = catalogoDe('manual')

describe('normalizar el texto base como la base', () => {
  it('cambia sólo `\\r\\n` por `\\n`', () => {
    expect(normalizarTextoBase('a\r\nb\rc')).toBe('a\nb\rc')
  })

  it('recorta espacios, tabuladores y saltos de los bordes, no de adentro ni otro blanco', () => {
    expect(normalizarTextoBase(' \t\n\r\nHola\n\n  mundo \t\r\n')).toBe('Hola\n\n  mundo')
    expect(normalizarTextoBase(' Hola ')).toBe(' Hola ')
  })
})

describe('validar el texto base', () => {
  it('uno bueno vuelve normalizado', () => {
    expect(validarTextoBase('  {vehiculo}\r\nVIN: {vin}\n', subasta)).toEqual({
      ok: true,
      texto: '{vehiculo}\nVIN: {vin}',
    })
  })

  it('no puede quedar vacío', () => {
    expect(validarTextoBase(' \n\t ', subasta)).toEqual({
      ok: false,
      campo: 'texto',
      motivo: 'El texto base no puede quedar vacío.',
    })
  })

  it(`lleva hasta ${String(LARGO_MAXIMO_DEL_TEXTO_BASE)} caracteres, contados como la base`, () => {
    expect(validarTextoBase('a'.repeat(LARGO_MAXIMO_DEL_TEXTO_BASE), subasta).ok).toBe(true)
    expect(validarTextoBase('a'.repeat(LARGO_MAXIMO_DEL_TEXTO_BASE + 1), subasta)).toEqual({
      ok: false,
      campo: 'texto',
      motivo: 'El texto base lleva hasta 2000 caracteres.',
    })
    // Un emoji es un carácter para `char_length()`, aunque en JavaScript mida dos.
    expect(validarTextoBase('🚗'.repeat(LARGO_MAXIMO_DEL_TEXTO_BASE), subasta).ok).toBe(true)
  })

  it('una `{…}` que no conoce, con el mensaje de la base', () => {
    expect(validarTextoBase('{vehiculo} {telefono}', subasta)).toEqual({
      ok: false,
      campo: 'variables',
      motivo: '{telefono} no es un dato que el texto base pueda llenar.',
    })
  })

  it('una de subasta en un origen manual', () => {
    expect(validarTextoBase('Lote: {lote}', manual)).toEqual({
      ok: false,
      campo: 'variables',
      motivo: '{lote} sólo se llena en un origen de subasta.',
    })
    expect(validarTextoBase('Lote: {lote}', subasta).ok).toBe(true)
  })

  it('un campo activo de la ficha y una celda valen; uno apagado no', () => {
    expect(validarTextoBase('{ficha.motor} {celda.Flete} {red.x}', manual).ok).toBe(true)
    expect(motivoDeLasVariables('{ficha.traccion}', manual)).toBe(
      '{ficha.traccion} no es un dato que el texto base pueda llenar.',
    )
    expect(motivoDeLasVariables('{celda.}', manual)).toBe(
      '{celda.} no es un dato que el texto base pueda llenar.',
    )
  })

  it('dice la primera que no vale, en su orden', () => {
    expect(motivoDeLasVariables('{x} {lote}', manual)).toBe(
      '{x} no es un dato que el texto base pueda llenar.',
    )
    expect(motivoDeLasVariables('{lote} {x}', manual)).toBe(
      '{lote} sólo se llena en un origen de subasta.',
    )
    expect(motivoDeLasVariables('{vin}', manual)).toBeNull()
  })
})
