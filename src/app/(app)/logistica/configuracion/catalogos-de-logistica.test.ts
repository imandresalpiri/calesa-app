import { describe, expect, it } from 'vitest'
import { CATALOGOS_DE_LOGISTICA } from './catalogos-de-logistica'

describe('catálogos de logística de Logística › Configuración', () => {
  it('transporte llena «Puertos» y «Navieras» y dinero «Categorías de gasto», en ese orden y con la clave de cada sub-ruta', () => {
    expect(CATALOGOS_DE_LOGISTICA.map((c) => [c.clave, c.titulo])).toEqual([
      ['puertos', 'Puertos'],
      ['navieras', 'Navieras'],
      ['categorias-de-gasto', 'Categorías de gasto'],
    ])
  })

  it('los tres se gestionan con `logistica.catalogos.gestionar`', () => {
    expect(new Set(CATALOGOS_DE_LOGISTICA.map((c) => c.permiso))).toEqual(
      new Set(['logistica.catalogos.gestionar']),
    )
  })
})
