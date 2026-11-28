import { describe, expect, it } from 'vitest'
import { TOPE_DEL_DOCUMENTO_EN_BYTES } from '../documento'
import {
  cuantasFaltan,
  esquemaDelPedidoDelPdf,
  PESO_MAXIMO_DEL_PEDIDO,
  rutaDelPdfDelArte,
} from './pedido-del-pdf'

const V = '11111111-1111-4111-8111-111111111111'

describe('el pedido del PDF de un arte', () => {
  it('lleva el documento crudo y la elección por ids, o nula', () => {
    expect(esquemaDelPedidoDelPdf.safeParse({ documento: {}, eleccion: null }).success).toBe(true)
    const eleccion = { vehiculoId: V, cotizacionId: null, leadId: null }
    expect(esquemaDelPedidoDelPdf.safeParse({ documento: 1, eleccion }).success).toBe(true)
    expect(
      esquemaDelPedidoDelPdf.safeParse({ documento: {}, eleccion: { vehiculoId: 'x' } }).success,
    ).toBe(false)
    expect(esquemaDelPedidoDelPdf.safeParse({ documento: {} }).success).toBe(false)
  })

  it('el cuerpo admite el documento más pesado que se guarda', () => {
    expect(PESO_MAXIMO_DEL_PEDIDO).toBeGreaterThan(TOPE_DEL_DOCUMENTO_EN_BYTES)
  })

  it('la ruta y la cabecera de lo que falta', () => {
    expect(rutaDelPdfDelArte(V)).toBe(`/artes/${V}/pdf`)
    expect(cuantasFaltan('3')).toBe(3)
    expect(cuantasFaltan('0')).toBe(0)
    for (const otra of [null, '', '-1', '1.5', 'tres']) {
      expect(cuantasFaltan(otra)).toBe(0)
    }
  })
})
