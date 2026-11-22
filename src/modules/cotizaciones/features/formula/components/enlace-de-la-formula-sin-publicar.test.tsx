import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { EnlaceDeLaFormulaSinPublicar } from './enlace-de-la-formula-sin-publicar'
import { ProveedorDelAjuste } from './hoja/proveedor-del-ajuste'
import { HUECOS_DE_FORMULA_EN_LA_HOJA } from './huecos-en-la-hoja'

afterEach(cleanup)

describe('EnlaceDeLaFormulaSinPublicar', () => {
  it('lleva a la planilla de ese origen, con el mismo texto y las mismas clases', () => {
    render(<EnlaceDeLaFormulaSinPublicar origenId="o1" />)
    const enlace = screen.getByRole('link', { name: 'Ir a la configuración de cotización' })
    expect(enlace.getAttribute('href')).toBe('/configuracion/origenes/o1/planilla')
    expect(enlace.className).toContain('min-h-11')
    expect(enlace.className).toContain('md:min-h-8')
  })
})

describe('HUECOS_DE_FORMULA_EN_LA_HOJA', () => {
  it('trae el enlace de la fórmula sin publicar', () => {
    expect(HUECOS_DE_FORMULA_EN_LA_HOJA.EnlaceSinPublicar).toBe(EnlaceDeLaFormulaSinPublicar)
  })

  it('trae el proveedor que enciende el ⚙ de las celdas', () => {
    expect(HUECOS_DE_FORMULA_EN_LA_HOJA.Proveedor).toBe(ProveedorDelAjuste)
  })
})
