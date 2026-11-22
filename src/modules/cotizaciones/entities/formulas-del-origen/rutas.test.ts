import { describe, expect, it } from 'vitest'
import { PANELES_DE_UNA_FORMULA } from '@/shared/lib/paneles-que-ya-no-existen'
import * as rutas from './rutas'

describe('los nombres de la URL de la barra de la fórmula', () => {
  it('cada panel y cada clave son distintos', () => {
    const valores = Object.values(rutas)
    expect(new Set(valores).size).toBe(valores.length)
    expect(rutas.PANEL_ACTIVAR_FORMULA).toBe('activar-formula')
    expect(rutas.CLAVE_DE_LA_FORMULA_DEL_PANEL).toBe('cual')
  })

  it('los paneles de una fórmula son los que traduce la ruta vieja', () => {
    expect([
      rutas.PANEL_RENOMBRAR_FORMULA,
      rutas.PANEL_ACTIVAR_FORMULA,
      rutas.PANEL_ARCHIVAR_FORMULA,
      rutas.PANEL_ELIMINAR_FORMULA,
    ]).toEqual(PANELES_DE_UNA_FORMULA)
  })
})
