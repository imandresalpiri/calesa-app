import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useVersionesDeRoles } from './use-versiones-de-roles'

const ROL = '33333333-3333-4333-8333-333333333333'
const OTRO = '44444444-4444-4444-8444-444444444444'

describe('useVersionesDeRoles', () => {
  it('sin ninguna edición, la versión es la de la pantalla', () => {
    const { result } = renderHook(() => useVersionesDeRoles())
    expect(result.current.de(ROL, '2026-11-20T12:00:00.000Z')).toBe('2026-11-20T12:00:00.000Z')
  })

  it('la más nueva gana, venga de la pantalla o de la última edición', () => {
    const { result } = renderHook(() => useVersionesDeRoles())
    result.current.poner(ROL, '2026-11-20T12:05:00.000Z')
    expect(result.current.de(ROL, '2026-11-20T12:00:00.000Z')).toBe('2026-11-20T12:05:00.000Z')
    // La pantalla ya trae una más nueva (otra persona, «Recargar»): esa.
    expect(result.current.de(ROL, '2026-11-20T12:10:00.000Z')).toBe('2026-11-20T12:10:00.000Z')
  })

  it('cada rol lleva la suya y la instancia es la misma entre dibujos', () => {
    const { result, rerender } = renderHook(() => useVersionesDeRoles())
    const primera = result.current
    result.current.poner(ROL, '2026-11-20T12:05:00.000Z')
    rerender()
    expect(result.current).toBe(primera)
    expect(result.current.de(OTRO, '2026-11-20T12:00:00.000Z')).toBe('2026-11-20T12:00:00.000Z')
  })
})
