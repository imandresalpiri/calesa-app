import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Envio } from '@/shared/lib/enviar-accion'
import { useEnvioConVersion } from './use-envio-con-version'

const refrescar = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: refrescar }) }))

let enLinea = true

function cambiarConexion(conectado: boolean) {
  enLinea = conectado
  act(() => {
    window.dispatchEvent(new Event(conectado ? 'online' : 'offline'))
  })
}

type Dato = { actualizadoEn: string }
const guardada: Envio<Dato> = { ok: true, data: { actualizadoEn: 'v2' } }
const sinRed: Envio<Dato> = {
  ok: false,
  sinRed: true,
  error: { codigo: 'inesperado', mensaje: 'No pudimos llegar al servidor.' },
}
const choque: Envio<Dato> = {
  ok: false,
  error: { codigo: 'conflicto', mensaje: 'Rosa lo cambió hace 3 min.' },
}

function montar(
  pedir: () => Promise<Envio<Dato>>,
  campoDelRechazo?: () => string | null,
  recargar?: () => Promise<void>,
) {
  const alGuardar = vi.fn()
  const hook = renderHook(
    ({ version }) =>
      useEnvioConVersion<Dato>({
        abierto: true,
        hayCambios: true,
        version,
        validar: () => null,
        pedir,
        alGuardar,
        campoDelRechazo,
        recargar,
      }),
    { initialProps: { version: 'v1' } },
  )
  return { ...hook, alGuardar }
}

beforeEach(() => {
  enLinea = true
  refrescar.mockClear()
  vi.spyOn(window.navigator, 'onLine', 'get').mockImplementation(() => enLinea)
})
afterEach(() => {
  vi.restoreAllMocks()
})

describe('useEnvioConVersion', () => {
  it('guarda y avisa a quien lo usa', async () => {
    const { result, alGuardar } = montar(() => Promise.resolve(guardada))
    let resultado = false
    await act(async () => {
      resultado = await result.current.enviar()
    })
    expect(resultado).toBe(true)
    expect(alGuardar).toHaveBeenCalledWith({ actualizadoEn: 'v2' })
    expect(result.current.conflicto).toBeNull()
  })

  it('un conflicto queda a la vista hasta que cambia la versión, y «Recargar» pide la de ahora', async () => {
    const { result, rerender, alGuardar } = montar(() => Promise.resolve(choque))
    await act(async () => {
      await result.current.enviar()
    })
    expect(result.current.conflicto).toBe('Rosa lo cambió hace 3 min.')
    expect(result.current.aviso).toBeNull()
    expect(alGuardar).not.toHaveBeenCalled()

    act(() => {
      result.current.recargar?.()
    })
    expect(refrescar).toHaveBeenCalledTimes(1)
    rerender({ version: 'v1' })
    expect(result.current.conflicto).toBe('Rosa lo cambió hace 3 min.')
    rerender({ version: 'v2' })
    expect(result.current.conflicto).toBeNull()
  })

  it('con su propio «Recargar» (una lista leída en el navegador) relee eso y no la página', async () => {
    const releer = vi.fn(() => Promise.resolve())
    const { result } = montar(() => Promise.resolve(choque), undefined, releer)
    await act(async () => {
      await result.current.enviar()
    })
    await act(async () => {
      result.current.recargar?.()
      await Promise.resolve()
    })
    expect(releer).toHaveBeenCalledTimes(1)
    expect(refrescar).not.toHaveBeenCalled()
  })
})

describe('useEnvioConVersion: sin red y de a uno', () => {
  it('sin red espera y, al volver la conexión, lo manda solo una vez', async () => {
    const pedir = vi
      .fn<() => Promise<Envio<Dato>>>()
      .mockResolvedValueOnce(sinRed)
      .mockResolvedValue(guardada)
    const { result, alGuardar } = montar(pedir)
    cambiarConexion(false)
    await act(async () => {
      await result.current.enviar()
    })
    expect(result.current.esperandoConexion).toBe(true)
    expect(alGuardar).not.toHaveBeenCalled()
    await act(async () => {
      cambiarConexion(true)
      await Promise.resolve()
    })
    expect(pedir).toHaveBeenCalledTimes(2)
    expect(alGuardar).toHaveBeenCalledTimes(1)
  })

  it('un rechazo de un campo va a ese campo; otro, arriba', async () => {
    const rechazo: Envio<Dato> = {
      ok: false,
      error: { codigo: 'regla', mensaje: 'Código de país inválido.', causa: 'telefono_cc' },
    }
    const { result } = montar(
      () => Promise.resolve(rechazo),
      () => 'telefonoCc',
    )
    await act(async () => {
      await result.current.enviar()
    })
    expect(result.current.errores).toEqual({ telefonoCc: 'Código de país inválido.' })
    expect(result.current.aviso).toBeNull()

    const otro = montar(() => Promise.resolve(rechazo))
    await act(async () => {
      await otro.result.current.enviar()
    })
    expect(otro.result.current.aviso).toBe('Código de país inválido.')
  })

  it('un doble envío manda un solo pedido', async () => {
    let soltar: (envio: Envio<Dato>) => void = () => undefined
    const pedir = vi.fn(
      () =>
        new Promise<Envio<Dato>>((resolver) => {
          soltar = resolver
        }),
    )
    const { result, alGuardar } = montar(pedir)
    let primero: Promise<boolean> = Promise.resolve(false)
    let segundo = true
    await act(async () => {
      primero = result.current.enviar()
      segundo = await result.current.enviar()
    })
    expect(segundo).toBe(false)
    expect(pedir).toHaveBeenCalledTimes(1)
    await act(async () => {
      soltar(guardada)
      await primero
    })
    expect(alGuardar).toHaveBeenCalledTimes(1)
  })
})
