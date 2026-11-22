import { describe, expect, it } from 'vitest'
import { formatoDeCelda, monedaDeFormato } from './formato-de-celda'

describe('formatoDeCelda y monedaDeFormato: el formato de un nodo en el de la celda', () => {
  it('usd en dólares, la moneda de la empresa sin código, pct en porcentaje y raw como número', () => {
    expect(formatoDeCelda('usd')).toBe('monto')
    expect(formatoDeCelda('moneda')).toBe('monto')
    expect(formatoDeCelda('pct')).toBe('porcentaje')
    expect(formatoDeCelda('raw')).toBe('numero')
    expect(monedaDeFormato('usd')).toBe('USD')
    expect(monedaDeFormato('moneda')).toBeUndefined()
    expect(monedaDeFormato('pct')).toBeUndefined()
  })
})
