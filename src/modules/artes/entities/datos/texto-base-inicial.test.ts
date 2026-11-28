import { describe, expect, it } from 'vitest'
import { catalogoDe } from './datos-de-prueba.soporte'
import { textoBaseInicial } from './texto-base-inicial'
import { validarTextoBase } from './texto-base'

describe('el texto base con que nace un origen', () => {
  it('el de subasta nombra el lote, la subasta y la hora del patio', () => {
    expect(textoBaseInicial('subasta').split('\n')).toEqual([
      '{vehiculo}',
      'Lote: {lote}',
      'Año: {anio}',
      'Kilometraje: {kilometraje}',
      'VIN: {vin}',
      'Subasta: {subasta}',
      'Hora del patio: {hora_del_patio}',
      'Total: {total}',
      'Modo de tipo de cambio: {modo}',
      'Válida hasta: {vigencia}',
      'Asesor: {asesor}',
      'Cargo: {cargo}',
      'WhatsApp: {whatsapp}',
    ])
  })

  it('el manual es el mismo sin esas tres líneas', () => {
    const manual = textoBaseInicial('manual').split('\n')
    expect(manual).toHaveLength(10)
    expect(manual.some((l) => /\{(lote|subasta|hora_del_patio)\}/.test(l))).toBe(false)
    expect(manual[0]).toBe('{vehiculo}')
    expect(manual.at(-1)).toBe('WhatsApp: {whatsapp}')
  })

  it('cada uno pasa las reglas del texto base de su origen', () => {
    expect(validarTextoBase(textoBaseInicial('subasta'), catalogoDe('subasta')).ok).toBe(true)
    expect(validarTextoBase(textoBaseInicial('manual'), catalogoDe('manual')).ok).toBe(true)
  })
})
