import { describe, expect, it } from 'vitest'
import {
  ANCHOS_DE_LA_VISTA_PREVIA,
  escalaDelLienzo,
  MEDIDAS_DE_LAS_VISTAS,
  vistaParaLaPantalla,
} from './anchos-de-la-vista-previa'

describe('las vistas del editor de la hoja', () => {
  it('son el celular, la laptop, la grande y el texto al 200 %', () => {
    expect(ANCHOS_DE_LA_VISTA_PREVIA).toEqual(['412', '1280', '1920', '200'])
    expect(MEDIDAS_DE_LAS_VISTAS['200']).toEqual({ ancho: 206, zoom: 2 })
  })

  it('sin ?vista= elige la que corresponde al ancho de la ventana', () => {
    expect(vistaParaLaPantalla(2560)).toBe('1920')
    expect(vistaParaLaPantalla(1920)).toBe('1920')
    expect(vistaParaLaPantalla(1919)).toBe('1280')
    expect(vistaParaLaPantalla(1280)).toBe('1280')
    expect(vistaParaLaPantalla(1279)).toBe('412')
    expect(vistaParaLaPantalla(1024)).toBe('412')
  })

  it('achica el lienzo para entrar en lo disponible y nunca lo agranda', () => {
    expect(escalaDelLienzo('1920', 960)).toBe(0.5)
    expect(escalaDelLienzo('1280', 1600)).toBe(1)
    expect(escalaDelLienzo('412', 0)).toBe(1)
    // «Texto al 200 %» mide 206 × 2 = 412 px.
    expect(escalaDelLienzo('200', 206)).toBe(0.5)
  })
})
