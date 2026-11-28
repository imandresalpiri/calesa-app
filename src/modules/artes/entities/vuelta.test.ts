import { describe, expect, it } from 'vitest'
import { vueltaAArtes } from './vuelta'

describe('vueltaAArtes', () => {
  it('vuelve a la lista con sus filtros', () => {
    expect(vueltaAArtes('/artes?formato=historia&de=mias')).toBe('/artes?formato=historia&de=mias')
    expect(vueltaAArtes('/artes')).toBe('/artes')
    expect(vueltaAArtes('/artes?pestana=imagenes')).toBe('/artes?pestana=imagenes')
  })

  it('sin anotación, o una que no es de la lista, va a /artes', () => {
    expect(vueltaAArtes(null)).toBe('/artes')
    expect(vueltaAArtes('/artes/7c0e6a1e-2f9b-4c1d-9a51-111111111111')).toBe('/artes')
    expect(vueltaAArtes('/artesanias')).toBe('/artes')
    expect(vueltaAArtes('/leads?vista=tabla')).toBe('/artes')
  })

  it('nada de otro sitio ni con caracteres de control', () => {
    expect(vueltaAArtes('//malo.example/artes')).toBe('/artes')
    expect(vueltaAArtes('https://malo.example/artes')).toBe('/artes')
    expect(vueltaAArtes('/artes?x=\n')).toBe('/artes')
  })
})
