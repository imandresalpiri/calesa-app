import { describe, expect, it } from 'vitest'
import { busquedaDelEjemplo } from './busqueda-de-vehiculos'

describe('busquedaDelEjemplo', () => {
  it('sin texto lista lo más nuevo', () => {
    expect(busquedaDelEjemplo('   ')).toEqual({ tipo: 'todos' })
  })

  it('con menos de 3 letras o números seguidos no busca', () => {
    expect(busquedaDelEjemplo('ra')).toEqual({ tipo: 'corta' })
    expect(busquedaDelEjemplo('12')).toEqual({ tipo: 'corta' })
    expect(busquedaDelEjemplo('a-b-c')).toEqual({ tipo: 'corta' })
  })

  it('busca el título, el VIN o el lote recortado', () => {
    expect(busquedaDelEjemplo('  rav4 ')).toEqual({ tipo: 'texto', texto: 'rav4' })
    expect(busquedaDelEjemplo('1234')).toEqual({ tipo: 'texto', texto: '1234' })
  })

  it('corta un texto larguísimo', () => {
    const leido = busquedaDelEjemplo('x'.repeat(500))
    expect(leido.tipo === 'texto' && leido.texto.length).toBe(100)
  })
})
