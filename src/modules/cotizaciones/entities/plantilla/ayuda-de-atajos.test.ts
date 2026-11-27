import { describe, expect, it } from 'vitest'
import { teclasDeLaCombinacion } from '@/shared/lib/atajos'
import { AYUDA_DE_LA_TARJETA } from './ayuda-de-atajos'

describe('la ayuda del editor de la tarjeta', () => {
  it('lista lo del lienzo, lo de la pantalla y guardar, sin repetir una combinación', () => {
    const combinaciones = AYUDA_DE_LA_TARJETA.atajos.map((a) => a.combinacion)
    expect(new Set(combinaciones).size).toBe(combinaciones.length)
    expect(combinaciones).toEqual(
      expect.arrayContaining([
        'mod+s',
        'alt+m',
        'alt+u',
        'alt+r',
        'alt+shift+r',
        'alt+c',
        'alt+shift+c',
        'mod+z',
      ]),
    )
  })

  it('cada atajo tiene teclas que mostrar', () => {
    for (const a of AYUDA_DE_LA_TARJETA.atajos) {
      expect(a.descripcion.length).toBeGreaterThan(0)
      expect(teclasDeLaCombinacion(a.combinacion, { mac: false }).length).toBeGreaterThan(0)
    }
  })

  it('nombra las teclas con Alt, Mayús y Espacio como se leen', () => {
    expect(teclasDeLaCombinacion('alt+shift+r', { mac: true })).toEqual(['⌥', 'Mayús', 'R'])
    expect(teclasDeLaCombinacion('shift+ ', { mac: false })).toEqual(['Mayús', 'Espacio'])
  })
})
