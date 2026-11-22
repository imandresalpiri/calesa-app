import { describe, expect, it } from 'vitest'
import { esLaPaginaDelOrigen } from './pagina-del-origen'

const ID = '11111111-1111-4111-8111-111111111111'

describe('esLaPaginaDelOrigen', () => {
  it('cada pestaña de un origen, y su entrada', () => {
    for (const parte of ['fases', 'planilla', 'hoja', 'tarjeta', 'campos', 'categorias']) {
      expect(esLaPaginaDelOrigen(`/configuracion/origenes/${ID}/${parte}`)).toBe(true)
    }
    expect(esLaPaginaDelOrigen(`/configuracion/origenes/${ID}`)).toBe(true)
  })

  it('la lista, «Nuevo origen» y la puesta en marcha no', () => {
    expect(esLaPaginaDelOrigen('/configuracion/origenes')).toBe(false)
    expect(esLaPaginaDelOrigen('/configuracion/origenes/nuevo')).toBe(false)
    expect(esLaPaginaDelOrigen(`/configuracion/origenes/${ID}/puesta-en-marcha/datos`)).toBe(false)
    expect(esLaPaginaDelOrigen('/configuracion/catalogos/colores')).toBe(false)
  })
})
