import { describe, expect, it } from 'vitest'
import { RUTAS } from './rutas'

describe('Configuración de repuestos', () => {
  it('vive en Repuestos, una sub-ruta por pestaña', () => {
    expect([
      RUTAS.configuracionDeRepuestos,
      RUTAS.flujoDeRepuestos,
      RUTAS.cotizadorDeRepuestos,
      RUTAS.catalogosDeRepuestos,
    ]).toEqual([
      '/repuestos/configuracion',
      '/repuestos/configuracion/flujo',
      '/repuestos/configuracion/cotizador',
      '/repuestos/configuracion/catalogos',
    ])
  })
})
