import { describe, expect, it } from 'vitest'
import {
  anotar,
  deshacer,
  ESPERA_DE_LA_FUSION_MS,
  historialVacio,
  rehacer,
  TOPE_DEL_HISTORIAL,
} from './historial'

describe('historial del editor', () => {
  it('deshace y rehace en orden', () => {
    let h = anotar(historialVacio<string>(), 'a', null)
    h = anotar(h, 'b', null)
    const uno = deshacer(h, 'c')
    expect(uno?.documento).toBe('b')
    const dos = uno && deshacer(uno.historial, uno.documento)
    expect(dos?.documento).toBe('a')
    expect(dos && deshacer(dos.historial, dos.documento)).toBeNull()
    const tres = dos && rehacer(dos.historial, dos.documento)
    expect(tres?.documento).toBe('b')
    const cuatro = tres && rehacer(tres.historial, tres.documento)
    expect(cuatro?.documento).toBe('c')
    expect(cuatro && rehacer(cuatro.historial, cuatro.documento)).toBeNull()
  })

  it('un cambio nuevo pierde lo deshecho', () => {
    const h = anotar(historialVacio<string>(), 'a', null)
    const atras = deshacer(h, 'b')
    expect(atras?.historial.futuro).toEqual(['b'])
    const nuevo = atras && anotar(atras.historial, atras.documento, null)
    expect(nuevo?.futuro).toEqual([])
  })

  it('funde los cambios seguidos con la misma clave', () => {
    let h = anotar(historialVacio<string>(), 'a', { clave: 'mover', en: 0 })
    h = anotar(h, 'b', { clave: 'mover', en: 500 })
    h = anotar(h, 'c', { clave: 'mover', en: 500 + ESPERA_DE_LA_FUSION_MS })
    expect(h.pasado).toEqual(['a'])
    h = anotar(h, 'd', { clave: 'mover', en: 1501 + 2 * ESPERA_DE_LA_FUSION_MS })
    expect(h.pasado).toEqual(['a', 'd'])
    h = anotar(h, 'e', { clave: 'color', en: 1502 + 2 * ESPERA_DE_LA_FUSION_MS })
    expect(h.pasado).toEqual(['a', 'd', 'e'])
  })

  it('después de deshacer no funde', () => {
    const h = anotar(historialVacio<string>(), 'a', { clave: 'mover', en: 0 })
    const atras = deshacer(h, 'b')
    const otra = atras && anotar(atras.historial, atras.documento, { clave: 'mover', en: 10 })
    expect(otra?.pasado).toEqual(['a'])
  })

  it(`guarda hasta ${String(TOPE_DEL_HISTORIAL)} pasos`, () => {
    let h = historialVacio<number>()
    for (let i = 0; i < TOPE_DEL_HISTORIAL + 5; i++) {
      h = anotar(h, i, null)
    }
    expect(h.pasado).toHaveLength(TOPE_DEL_HISTORIAL)
    expect(h.pasado[0]).toBe(5)
  })
})
