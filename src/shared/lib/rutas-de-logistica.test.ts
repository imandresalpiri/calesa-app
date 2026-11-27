import { describe, expect, it } from 'vitest'
import {
  contenedorDeLogistica,
  declaracionDeAduana,
  embarqueDeLogistica,
  loteDelContenedor,
} from './rutas'

describe('embarques, contenedores y declaraciones por su id', () => {
  const ID = '6f1b7c1e-2f0a-4e0f-9c52-1d7c1a2b3c4d'
  const ORIGEN = '11111111-1111-4111-8111-111111111111'

  it('el embarque es una página; el contenedor y la declaración, un drawer sobre su lista', () => {
    expect(embarqueDeLogistica(ID)).toBe(`/logistica/embarques/${ID}`)
    expect(embarqueDeLogistica(ID, ORIGEN)).toBe(`/logistica/embarques/${ID}?origen=${ORIGEN}`)
    expect(contenedorDeLogistica(ID, ORIGEN)).toBe(
      `/logistica/embarques?origen=${ORIGEN}&contenedor=${ID}`,
    )
    expect(contenedorDeLogistica(ID)).toBe(`/logistica/embarques?contenedor=${ID}`)
    expect(declaracionDeAduana(ID, ORIGEN)).toBe(
      `/logistica/aduana?origen=${ORIGEN}&declaracion=${ID}`,
    )
    expect(loteDelContenedor(ID, ORIGEN)).toBe(
      `/logistica?origen=${ORIGEN}&panel=lote&contenedor=${ID}`,
    )
    expect(loteDelContenedor(ID, null)).toBe(`/logistica?panel=lote&contenedor=${ID}`)
  })

  it('un id raro no rompe la ruta', () => {
    expect(embarqueDeLogistica('../x?y')).toBe('/logistica/embarques/..%2Fx%3Fy')
  })
})
