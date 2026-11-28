import { describe, expect, it } from 'vitest'
import {
  PESTANAS_DEL_PANEL_DERECHO,
  PESTANAS_DEL_PANEL_IZQUIERDO,
  TITULOS_DEL_PANEL_DERECHO,
  TITULOS_DEL_PANEL_IZQUIERDO,
} from './paneles'

describe('las pestañas de los paneles del editor', () => {
  it('a la izquierda «Agregar» y «Capas»; a la derecha «Diseño» y «Textos»', () => {
    expect(PESTANAS_DEL_PANEL_IZQUIERDO.map((p) => TITULOS_DEL_PANEL_IZQUIERDO[p])).toEqual([
      'Agregar',
      'Capas',
    ])
    expect(PESTANAS_DEL_PANEL_DERECHO.map((p) => TITULOS_DEL_PANEL_DERECHO[p])).toEqual([
      'Diseño',
      'Textos',
    ])
  })
})
