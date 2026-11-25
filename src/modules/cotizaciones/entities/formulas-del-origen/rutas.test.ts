import { describe, expect, it } from 'vitest'
import * as rutas from './rutas'

describe('los nombres de la URL de la barra de la fórmula', () => {
  it('cada panel y cada clave son distintos', () => {
    const valores = Object.values(rutas)
    expect(new Set(valores).size).toBe(valores.length)
    expect(rutas.PANEL_ACTIVAR_FORMULA).toBe('activar-formula')
    expect(rutas.CLAVE_DE_LA_FORMULA_DEL_PANEL).toBe('cual')
  })
})
