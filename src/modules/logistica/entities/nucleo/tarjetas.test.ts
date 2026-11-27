import { describe, expect, it } from 'vitest'
import { ORDEN_DE_HUECOS } from './hueco'
import {
  esTarjetaConocida,
  huecosDeLaTarjeta,
  ORDEN_DE_TARJETAS,
  TARJETA_DEL_HUECO,
  tarjetaDelHueco,
  tarjetasDeLaUnidad,
} from './tarjetas'

const hueco = (clave: string) => ({ clave, titulo: clave })

describe('tarjetas de la unidad', () => {
  it('pone cada hueco en su tarjeta y deja «Qué falta» fuera', () => {
    expect(TARJETA_DEL_HUECO['que-falta']).toBeNull()
    expect(tarjetaDelHueco('pagos')).toBe('dinero')
    expect(tarjetaDelHueco('gastos')).toBe('dinero')
    expect(tarjetaDelHueco('margen')).toBe('dinero')
    expect(tarjetaDelHueco('documentos')).toBe('documentos')
    expect(tarjetaDelHueco('que-falta')).toBeNull()
    expect(tarjetaDelHueco('cualquiera')).toBeNull()
    expect(tarjetaDelHueco(null)).toBeNull()
  })

  it('toda tarjeta tiene al menos un hueco', () => {
    for (const t of ORDEN_DE_TARJETAS) expect(huecosDeLaTarjeta(t).length).toBeGreaterThan(0)
    expect(huecosDeLaTarjeta('dinero')).toEqual(['gastos', 'pagos', 'margen'])
  })

  it('reconoce sólo las claves de tarjeta: las de un hueco suelto ya no abren nada', () => {
    expect(esTarjetaConocida('dinero')).toBe(true)
    expect(esTarjetaConocida('historial')).toBe(true)
    expect(esTarjetaConocida('pagos')).toBe(false)
    expect(esTarjetaConocida('que-falta')).toBe(false)
    expect(esTarjetaConocida(undefined)).toBe(false)
  })

  it('ordena las tarjetas por ORDEN_DE_TARJETAS, no por el orden del archivo', () => {
    const todas = tarjetasDeLaUnidad([...ORDEN_DE_HUECOS].reverse().map(hueco))
    expect(todas.map((t) => t.clave)).toEqual([...ORDEN_DE_TARJETAS])
    expect(todas.find((t) => t.clave === 'dinero')?.huecos.map((h) => h.clave)).toEqual([
      'gastos',
      'pagos',
      'margen',
    ])
    expect(todas[0]?.titulo).toBe('Documentos')
  })

  it('Dinero aparece con lo que se ve y una tarjeta sin huecos no aparece', () => {
    const tarjetas = tarjetasDeLaUnidad(['que-falta', 'margen', 'notas', 'otra'].map(hueco))
    expect(tarjetas.map((t) => t.clave)).toEqual(['dinero', 'notas'])
    expect(tarjetas[0]?.huecos.map((h) => h.clave)).toEqual(['margen'])
  })
})
