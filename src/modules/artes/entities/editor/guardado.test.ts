import { describe, expect, it } from 'vitest'
import { estadoDelGuardado, TEXTOS_DEL_GUARDADO } from './guardado'

describe('el estado del guardado', () => {
  it('sin cambios, guardado; con cambios, cambios sin guardar', () => {
    expect(estadoDelGuardado({ enCurso: false, fallo: null, hayCambios: false })).toBe('guardado')
    expect(estadoDelGuardado({ enCurso: false, fallo: null, hayCambios: true })).toBe('cambios')
  })

  it('mientras se envía, guardando, aunque el último haya fallado', () => {
    expect(estadoDelGuardado({ enCurso: true, fallo: 'error', hayCambios: true })).toBe('guardando')
  })

  it('un fallo queda hasta que un guardado sale bien', () => {
    expect(estadoDelGuardado({ enCurso: false, fallo: 'sin-conexion', hayCambios: true })).toBe(
      'sin-conexion',
    )
    expect(estadoDelGuardado({ enCurso: false, fallo: 'conflicto', hayCambios: true })).toBe(
      'conflicto',
    )
    expect(estadoDelGuardado({ enCurso: false, fallo: 'error', hayCambios: true })).toBe('error')
  })

  it('los textos del renglón', () => {
    expect(TEXTOS_DEL_GUARDADO['sin-conexion']).toBe('Sin conexión: se guarda cuando vuelva.')
    expect(TEXTOS_DEL_GUARDADO.error).toBe('No se pudo guardar.')
    expect(TEXTOS_DEL_GUARDADO.conflicto).toBe(TEXTOS_DEL_GUARDADO.cambios)
  })
})
