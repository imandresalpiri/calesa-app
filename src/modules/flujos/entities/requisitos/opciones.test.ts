import { describe, expect, it } from 'vitest'
import { nombreDelTipo, seOfreceParaUnoNuevo, type TipoParaRequisito } from './opciones'

const tipo = (parcial: Partial<TipoParaRequisito>): TipoParaRequisito => ({
  id: 't1',
  nombre: 'Factura',
  formatos: ['application/pdf'],
  activo: true,
  delFlujo: false,
  tapadoPor: null,
  ...parcial,
})

describe('un tipo compartido que el flujo tapa', () => {
  it('no se ofrece para un requisito nuevo, como uno inactivo', () => {
    expect(seOfreceParaUnoNuevo(tipo({}))).toBe(true)
    expect(seOfreceParaUnoNuevo(tipo({ tapadoPor: 'el de Miami' }))).toBe(false)
    expect(seOfreceParaUnoNuevo(tipo({ activo: false }))).toBe(false)
  })

  it('el que un requisito ya pide se nombra diciendo quién lo tapa', () => {
    expect(nombreDelTipo(tipo({}))).toBe('Factura')
    expect(nombreDelTipo(tipo({ tapadoPor: 'el del flujo de repuestos' }))).toBe(
      'Factura (tapado por el del flujo de repuestos)',
    )
  })
})
