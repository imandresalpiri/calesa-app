import { describe, expect, it } from 'vitest'
import { partesDelTexto } from './texto-de-la-ayuda'

describe('partesDelTexto: la negrita de la ayuda va entre **', () => {
  it('sin marcas, un solo trozo de texto', () => {
    expect(partesDelTexto('El IVA se paga en aduana.')).toEqual([
      { texto: 'El IVA se paga en aduana.', negrita: false },
    ])
  })

  it('cada par de ** es una negrita, en su orden', () => {
    expect(partesDelTexto('Elige el **tipo de vehículo** y el **año**.')).toEqual([
      { texto: 'Elige el ', negrita: false },
      { texto: 'tipo de vehículo', negrita: true },
      { texto: ' y el ', negrita: false },
      { texto: 'año', negrita: true },
      { texto: '.', negrita: false },
    ])
  })

  it('un ** sin pareja se muestra tal cual', () => {
    expect(partesDelTexto('Un **par** y uno **suelto')).toEqual([
      { texto: 'Un ', negrita: false },
      { texto: 'par', negrita: true },
      { texto: ' y uno **suelto', negrita: false },
    ])
    expect(partesDelTexto('**')).toEqual([{ texto: '**', negrita: false }])
  })

  it('una negrita vacía no dibuja nada y los trozos vecinos se juntan', () => {
    expect(partesDelTexto('a****b')).toEqual([{ texto: 'ab', negrita: false }])
  })

  it('al principio y al final, y con los saltos de línea dentro', () => {
    expect(partesDelTexto('**Ojo:**\nse paga **antes**')).toEqual([
      { texto: 'Ojo:', negrita: true },
      { texto: '\nse paga ', negrita: false },
      { texto: 'antes', negrita: true },
    ])
  })

  it('vacío, nada', () => {
    expect(partesDelTexto('')).toEqual([])
  })
})
