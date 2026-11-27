import { describe, expect, it } from 'vitest'
import {
  huecoDelPanel,
  panelDelHueco,
  tipoDeGrupoDeLaVista,
  vistaDeGrupos,
  vistaDelOrigen,
  vistasDeTransporte,
} from './paneles'

describe('vistasDeTransporte', () => {
  it('cada vista con su regla, en orden', () => {
    expect(vistasDeTransporte(['transporte', 'contenedor', 'aduana'])).toEqual([
      'embarques',
      'contenedores',
    ])
    expect(vistasDeTransporte(['contenedor'])).toEqual(['contenedores'])
    expect(vistasDeTransporte(['transporte'])).toEqual(['embarques'])
    expect(vistasDeTransporte(['aduana'])).toEqual([])
  })
})

describe('vistaDelOrigen', () => {
  it('sin pedido, la primera del origen', () => {
    expect(vistaDelOrigen(undefined, ['embarques', 'contenedores'])).toBe('embarques')
    expect(vistaDelOrigen(null, ['contenedores'])).toBe('contenedores')
    expect(vistaDelOrigen('', ['contenedores'])).toBe('contenedores')
  })

  it('la pedida si el origen la usa; si no, `no_usa`', () => {
    expect(vistaDelOrigen('contenedores', ['embarques', 'contenedores'])).toBe('contenedores')
    expect(vistaDelOrigen('contenedores', ['embarques'])).toBe('no_usa')
    expect(vistaDelOrigen('embarques', ['contenedores'])).toBe('no_usa')
    expect(vistaDelOrigen(undefined, [])).toBe('no_usa')
  })

  it('un valor raro es «embarques», como siempre', () => {
    expect(vistaDeGrupos('otra')).toBe('embarques')
    expect(vistaDelOrigen('otra', ['contenedores'])).toBe('no_usa')
  })
})

describe('el panel de un hueco del grupo', () => {
  it('`grupo-<clave>` da la clave y vuelve a armarse', () => {
    expect(huecoDelPanel('grupo-documentos')).toBe('documentos')
    expect(huecoDelPanel(panelDelHueco('gastos'))).toBe('gastos')
  })

  it('otro panel, vacío o sin clave no es un hueco', () => {
    expect(huecoDelPanel('editar-embarque')).toBeNull()
    expect(huecoDelPanel('grupo-')).toBeNull()
    expect(huecoDelPanel(null)).toBeNull()
    expect(huecoDelPanel(undefined)).toBeNull()
  })
})

describe('tipoDeGrupoDeLaVista', () => {
  it('cada vista con su entidad', () => {
    expect(tipoDeGrupoDeLaVista('embarques')).toBe('embarque')
    expect(tipoDeGrupoDeLaVista('contenedores')).toBe('contenedor')
  })
})
