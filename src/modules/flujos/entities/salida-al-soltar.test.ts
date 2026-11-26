import { describe, expect, it } from 'vitest'
import { motivoParaNoVincular } from './salida-al-soltar'

const flujo = {
  fases: [
    { id: 'a', nombre: 'Compra', activa: true },
    { id: 'b', nombre: 'Embarque', activa: true },
    { id: 'c', nombre: 'Vieja', activa: false },
  ],
  transiciones: [{ id: 't', deFaseId: 'a', aFaseId: 'b' }],
} as unknown as Parameters<typeof motivoParaNoVincular>[0]

describe('motivoParaNoVincular', () => {
  it('con los textos de la base', () => {
    expect(motivoParaNoVincular(flujo, 'a', 'a')).toBe(
      'Una transición no puede volver a la misma fase.',
    )
    expect(motivoParaNoVincular(flujo, 'a', 'b')).toBe(
      'Ya hay una transición de «Compra» a «Embarque».',
    )
    expect(motivoParaNoVincular(flujo, 'a', 'c')).toBe(
      'La fase «Vieja» está jubilada: no puede ser destino.',
    )
  })

  it('al revés de una que ya existe, sí se puede', () => {
    expect(motivoParaNoVincular(flujo, 'b', 'a')).toBeNull()
  })
})
