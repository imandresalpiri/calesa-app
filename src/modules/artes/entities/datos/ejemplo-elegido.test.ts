import { describe, expect, it } from 'vitest'
import { claveDelEjemplo, eleccionVacia, leerElEjemplo } from './ejemplo-elegido'

const VEHICULO = '11111111-1111-4111-8111-111111111111'
const COTIZACION = '33333333-3333-4333-8333-333333333333'

describe('el vehículo de ejemplo recordado', () => {
  it('se recuerda por persona y plantilla', () => {
    expect(claveDelEjemplo('ana', 'p1')).toBe('artes:ejemplo:ana:p1')
    expect(claveDelEjemplo('ana', 'p1')).not.toBe(claveDelEjemplo('ana', 'p2'))
    expect(claveDelEjemplo('ana', 'p1')).not.toBe(claveDelEjemplo('teo', 'p1'))
  })

  it('lee lo que se guardó bien', () => {
    const eleccion = { vehiculoId: VEHICULO, cotizacionId: COTIZACION, leadId: null }
    expect(leerElEjemplo(JSON.stringify(eleccion))).toEqual(eleccion)
  })

  it('lo que falta, lo roto o lo ajeno no cuenta', () => {
    expect(leerElEjemplo(null)).toBeNull()
    expect(leerElEjemplo('{roto')).toBeNull()
    expect(leerElEjemplo('null')).toBeNull()
    expect(
      leerElEjemplo(
        JSON.stringify({ vehiculoId: 'no-es-un-id', cotizacionId: null, leadId: null }),
      ),
    ).toBeNull()
    expect(leerElEjemplo(JSON.stringify({ vehiculoId: VEHICULO }))).toBeNull()
  })

  it('sin elección, los datos de ejemplo', () => {
    expect(eleccionVacia).toBeNull()
  })
})
