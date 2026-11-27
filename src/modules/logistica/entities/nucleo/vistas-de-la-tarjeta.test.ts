import { describe, expect, it } from 'vitest'
import { vistaActiva, type VistaDeLaTarjeta } from './vistas-de-la-tarjeta'

const vista = (clave: string, paneles: readonly string[] = []): VistaDeLaTarjeta => ({
  clave,
  titulo: clave,
  paneles,
})
const DINERO = [
  vista('gastos', ['gasto', 'eliminar-gasto']),
  vista('pagos', ['pago', 'confirmar-pago']),
  vista('margen', ['desglose-del-margen']),
]

describe('vistaActiva', () => {
  it('sin nada en la URL, la primera que existe', () => {
    expect(vistaActiva(DINERO, { pedida: null, panel: null })).toBe('gastos')
    expect(vistaActiva(DINERO.slice(1), { pedida: null, panel: null })).toBe('pagos')
  })

  it('la pedida, si existe; una que no existe cae en la primera', () => {
    expect(vistaActiva(DINERO, { pedida: 'margen', panel: null })).toBe('margen')
    expect(vistaActiva(DINERO.slice(1), { pedida: 'gastos', panel: null })).toBe('pagos')
    expect(vistaActiva(DINERO, { pedida: 'cualquiera', panel: null })).toBe('gastos')
  })

  it('un panel abierto manda: su hueco tiene que estar montado', () => {
    expect(vistaActiva(DINERO, { pedida: 'gastos', panel: 'pago' })).toBe('pagos')
    expect(vistaActiva(DINERO, { pedida: null, panel: 'desglose-del-margen' })).toBe('margen')
    expect(vistaActiva(DINERO, { pedida: 'margen', panel: 'otro' })).toBe('margen')
  })

  it('sin vistas, ninguna', () => {
    expect(vistaActiva([], { pedida: 'gastos', panel: 'pago' })).toBeNull()
  })
})
