import { describe, expect, it } from 'vitest'
import { destinoDeLaUrlVieja } from './url-vieja'

describe('la URL vieja de Configuración › Repuestos (`/configuracion/repuestos`)', () => {
  it('sin nada, abre el flujo de repuestos', () => {
    expect(destinoDeLaUrlVieja({})).toBe('/repuestos/configuracion/flujo')
  })

  it('con una `seccion` ajena, o la de catálogos, abre Catálogos', () => {
    expect(destinoDeLaUrlVieja({ seccion: 'basura' })).toBe('/repuestos/configuracion/catalogos')
    expect(destinoDeLaUrlVieja({ seccion: 'catalogos' })).toBe('/repuestos/configuracion/catalogos')
  })

  it('`?seccion=cotizador` abre el cotizador', () => {
    expect(destinoDeLaUrlVieja({ seccion: 'cotizador' })).toBe('/repuestos/configuracion/cotizador')
  })

  it('los paneles de los catálogos viajan a Catálogos', () => {
    expect(destinoDeLaUrlVieja({ panel: 'nuevo-valor', catalogo: 'tipo-de-pieza' })).toBe(
      '/repuestos/configuracion/catalogos?panel=nuevo-valor&catalogo=tipo-de-pieza',
    )
    expect(destinoDeLaUrlVieja({ seccion: 'catalogos', panel: 'editar-valor', valor: 'v-1' })).toBe(
      '/repuestos/configuracion/catalogos?panel=editar-valor&valor=v-1',
    )
  })

  it('los de tramo y caja viajan al cotizador, con su moneda', () => {
    expect(
      destinoDeLaUrlVieja({ seccion: 'cotizador', panel: 'tramo', tramo: 'nuevo', moneda: 'USD' }),
    ).toBe('/repuestos/configuracion/cotizador?panel=tramo&tramo=nuevo&moneda=USD')
    expect(destinoDeLaUrlVieja({ seccion: 'cotizador', panel: 'caja', caja: 'c-1' })).toBe(
      '/repuestos/configuracion/cotizador?panel=caja&caja=c-1',
    )
  })
})
