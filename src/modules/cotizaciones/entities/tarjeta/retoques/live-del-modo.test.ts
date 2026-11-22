import { describe, expect, it } from 'vitest'
import type { CeldaDibujada } from '../geometria-de-la-tarjeta'
import { campoTapadoPorLive, MONTO_TAPADO, textoParaNombrar } from './live-del-modo'

const celda = (contenido: CeldaDibujada['contenido']) => ({ contenido }) as CeldaDibujada

const CON_UN_MONTO = celda({
  tipo: 'texto',
  lineas: ['Total:', 'US$ 1.355,00 (n.º 12)'],
  tramos: ['Total:\n', { valor: 1355, moneda: 'USD', texto: 'US$ 1.355,00' }, ' (n.º 12)'],
})
const SIN_MONTO = celda({ tipo: 'texto', lineas: ['Comisión giro 4,2 %'] })

describe('el modo «Retocar» con el Modo Live', () => {
  it('nombra un texto con un monto por sus tramos, con el monto tapado; sin Live, con la cifra', () => {
    expect(textoParaNombrar(CON_UN_MONTO, true)).toBe(`Total:\n${MONTO_TAPADO} (n.º 12)`)
    expect(textoParaNombrar(CON_UN_MONTO, false)).toBe('Total:\nUS$ 1.355,00 (n.º 12)')
  })

  it('un texto sin monto y una celda que no es texto se nombran igual con Live', () => {
    expect(textoParaNombrar(SIN_MONTO, true)).toBe('Comisión giro 4,2 %')
    expect(textoParaNombrar(celda({ tipo: 'vacio' }), true)).toBe('')
  })

  it('sólo tapa el campo de un texto con un monto y con Live', () => {
    expect(campoTapadoPorLive(CON_UN_MONTO, true)).toBe(true)
    expect(campoTapadoPorLive(CON_UN_MONTO, false)).toBe(false)
    expect(campoTapadoPorLive(SIN_MONTO, true)).toBe(false)
    expect(campoTapadoPorLive(celda({ tipo: 'logo' }), true)).toBe(false)
  })
})
