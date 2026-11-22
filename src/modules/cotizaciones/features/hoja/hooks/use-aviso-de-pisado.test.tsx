import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ok } from '@/shared/lib/errores'
import { hojaDePrueba, respuestaDePrueba } from '../../../entities/hoja-de-prueba.soporte'
import { useHoja } from './use-hoja'

vi.mock('../../../composicion.client', () => ({
  recalcular: vi.fn(() => Promise.resolve(ok(respuestaDePrueba()))),
}))

afterEach(cleanup)

// El aviso de la primera vez que se pisa un cálculo (`docs/COTIZADOR.md` › «Pisar un cálculo»): `fees` es un cálculo, `transferencia` uno con un atajo, `remate`
// un dato e `iva_c` una constante.
const INICIAL = { respuesta: respuestaDePrueba(), estado: { tipo: 'al_dia' } } as const
const montar = () => {
  const hoja = hojaDePrueba()
  return renderHook(() => useHoja({ hoja, inicial: INICIAL, vehiculoId: null }))
}

describe('useHoja: el aviso de la primera vez que se pisa un cálculo', () => {
  it('lo escrito sobre un dato o una constante no lo enciende; sobre un cálculo, sí', () => {
    const hook = montar()
    act(() => {
      hook.result.current.acciones.alConfirmar('remate', 9500)
      hook.result.current.acciones.alConfirmar('iva_c', 0.2)
    })
    expect(hook.result.current.avisoDePisado).toBe(false)
    act(() => {
      hook.result.current.acciones.alConfirmar('fees', 1300)
    })
    expect(hook.result.current.avisoDePisado).toBe(true)
  })

  it('una vez por hoja: cerrado no vuelve aunque se pise otro cálculo o el mismo tras ↺', () => {
    const hook = montar()
    act(() => {
      hook.result.current.acciones.alConfirmar('fees', 1300)
    })
    act(() => {
      hook.result.current.cerrarAvisoDePisado()
    })
    expect(hook.result.current.avisoDePisado).toBe(false)
    act(() => {
      hook.result.current.acciones.alRestablecer('fees')
      hook.result.current.acciones.alConfirmar('fees', 1200)
      hook.result.current.acciones.alConfirmar('factor', 0.5)
    })
    expect(hook.result.current.avisoDePisado).toBe(false)
  })

  it('un atajo sobre un cálculo también pisa; cerrar el aviso no cambia los callbacks de las celdas', () => {
    const hook = montar()
    const antes = hook.result.current.acciones
    act(() => {
      hook.result.current.acciones.alElegirAtajo('transferencia', 0, 0)
    })
    expect(hook.result.current.avisoDePisado).toBe(true)
    act(() => {
      hook.result.current.cerrarAvisoDePisado()
    })
    expect(hook.result.current.acciones).toBe(antes)
  })

  it('reponer lo tipeado (el borrador) no lo enciende', () => {
    const hook = montar()
    act(() => {
      const e = hook.result.current.entradas
      hook.result.current.reponer({ ...e, overrides: new Map([['fees', 1300]]) }, false)
    })
    expect(hook.result.current.entradas.overrides.get('fees')).toBe(1300)
    expect(hook.result.current.avisoDePisado).toBe(false)
  })
})
