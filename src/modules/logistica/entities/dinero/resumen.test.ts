import { describe, expect, it } from 'vitest'
import { resumenDeDinero, type DineroDelResumen } from './resumen'

const dinero = (extra: Partial<DineroDelResumen> = {}): DineroDelResumen => ({
  gastos: 0,
  pagos: [],
  margen: null,
  puedeRegistrarGasto: false,
  puedeRegistrarPago: false,
  ...extra,
})

describe('resumenDeDinero', () => {
  it('vacío: una línea por vista', () => {
    expect(resumenDeDinero(dinero()).lineas).toEqual(['Sin gastos todavía', 'Sin pagos todavía'])
  })

  it('cuenta gastos y pagos sin sumar montos, con «más de» pasado el tope', () => {
    expect(resumenDeDinero(dinero({ gastos: 3, pagos: [true, true] })).lineas).toEqual([
      '3 gastos',
      '2 pagos',
    ])
    expect(resumenDeDinero(dinero({ gastos: 51, pagos: [true] })).lineas).toEqual([
      'más de 50 gastos',
      '1 pago',
    ])
  })

  it('el margen es la cifra de la base: un nulo es «sin venta registrada», un 0 es un monto', () => {
    expect(resumenDeDinero(dinero({ margen: { valor: 1200 } })).lineas[2]).toEqual({
      etiqueta: 'Margen',
      monto: 1200,
    })
    expect(resumenDeDinero(dinero({ margen: { valor: 0 } })).lineas[2]).toEqual({
      etiqueta: 'Margen',
      monto: 0,
    })
    expect(resumenDeDinero(dinero({ margen: { valor: null } })).lineas[2]).toBe(
      'Margen: sin venta registrada',
    )
  })

  it('sólo nombra las vistas que se ven', () => {
    expect(resumenDeDinero(dinero({ gastos: null, pagos: [true] })).lineas).toEqual(['1 pago'])
    expect(
      resumenDeDinero(dinero({ gastos: null, pagos: null, margen: { valor: null } })).lineas,
    ).toEqual(['Margen: sin venta registrada'])
  })

  it('avisa los pagos sin confirmar', () => {
    expect(resumenDeDinero(dinero({ pagos: [false, true] })).aviso).toBe('Pago sin confirmar')
    expect(resumenDeDinero(dinero({ pagos: [false, false] })).aviso).toBe('2 pagos sin confirmar')
    expect(resumenDeDinero(dinero({ pagos: [true] })).aviso).toBeNull()
  })

  it('registrar, con el permiso de editar y el hueco a la vista', () => {
    const todo = resumenDeDinero(dinero({ puedeRegistrarGasto: true, puedeRegistrarPago: true }))
    expect(todo.acciones.map((a) => a.etiqueta)).toEqual([
      'Ver el dinero',
      'Registrar gasto',
      'Registrar pago',
    ])
    expect(todo.acciones[2]?.destino).toEqual({
      tipo: 'drawer',
      url: { panel: 'pago', pago: 'nuevo' },
    })
    const sinPagos = resumenDeDinero(
      dinero({ pagos: null, puedeRegistrarGasto: true, puedeRegistrarPago: true }),
    )
    expect(sinPagos.acciones.map((a) => a.clave)).toEqual(['ver', 'registrar-gasto'])
  })
})
