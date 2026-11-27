import { act, cleanup, render, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CLASE_LIVE, CLAVE_LIVE, valorDeLaCookie } from '@/shared/lib/modo-live'
import {
  AVISO_DEL_LIVE_CAMBIADO,
  AVISO_SIN_PERMISO_DEL_LIVE,
  ProveedorDelLive,
  useConmutarElLive,
} from './proveedor-del-live'

const router = { refresh: vi.fn() }
vi.mock('next/navigation', () => ({ useRouter: () => router }))

const avisar = vi.fn()
const avisarHastaCerrar = vi.fn()
const terminarProgreso = vi.fn()
vi.mock('./toasts', () => ({
  avisar: (m: string) => avisar(m),
  avisarHastaCerrar: (id: string, m: string) => avisarHastaCerrar(id, m),
  terminarProgreso: (id: string) => terminarProgreso(id),
}))

function claseEncendida(): boolean {
  return document.documentElement.classList.contains(CLASE_LIVE)
}

function cookie(): string | undefined {
  return valorDeLaCookie(document.cookie)
}

beforeEach(() => {
  router.refresh.mockReset()
  avisar.mockReset()
  avisarHastaCerrar.mockReset()
  terminarProgreso.mockReset()
})

afterEach(() => {
  cleanup()
  document.documentElement.classList.remove(CLASE_LIVE)
  document.cookie = 'modo-live=; Max-Age=0; Path=/'
  localStorage.clear()
})

describe('ProveedorDelLive', () => {
  it('sin permiso para encenderlo, lo encuentra encendido y lo apaga con su aviso', () => {
    document.documentElement.classList.add(CLASE_LIVE)
    document.cookie = 'modo-live=1; Path=/'
    render(
      <ProveedorDelLive puedeEncender={false} enElServidor={false}>
        x
      </ProveedorDelLive>,
    )
    expect(claseEncendida()).toBe(false)
    expect(cookie()).toBe('0')
    expect(avisar).toHaveBeenCalledWith(AVISO_SIN_PERMISO_DEL_LIVE)
  })

  it('sin permiso y apagado, no avisa nada', () => {
    render(
      <ProveedorDelLive puedeEncender={false} enElServidor={false}>
        x
      </ProveedorDelLive>,
    )
    expect(avisar).not.toHaveBeenCalled()
  })

  it('lo guardado antes de la cookie pasa a la cookie y el servidor vuelve a dibujar', () => {
    localStorage.setItem(CLAVE_LIVE, '1')
    render(
      <ProveedorDelLive puedeEncender enElServidor={false}>
        x
      </ProveedorDelLive>,
    )
    expect(cookie()).toBe('1')
    expect(claseEncendida()).toBe(true)
    expect(router.refresh).toHaveBeenCalledTimes(1)
  })

  it('con la cookie puesta no toca nada al montar', () => {
    document.cookie = 'modo-live=0; Path=/'
    localStorage.setItem(CLAVE_LIVE, '1')
    render(
      <ProveedorDelLive puedeEncender enElServidor={false}>
        x
      </ProveedorDelLive>,
    )
    expect(router.refresh).not.toHaveBeenCalled()
  })

  it('si otra pestaña lo cambia, ofrece recargar mientras lo dibujado no coincide', () => {
    document.cookie = 'modo-live=0; Path=/'
    render(
      <ProveedorDelLive puedeEncender enElServidor={false}>
        x
      </ProveedorDelLive>,
    )
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: CLAVE_LIVE, newValue: '1' }))
    })
    expect(avisarHastaCerrar).toHaveBeenCalledWith('live-cambio', AVISO_DEL_LIVE_CAMBIADO)
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: CLAVE_LIVE, newValue: '0' }))
    })
    expect(terminarProgreso).toHaveBeenCalledWith('live-cambio')
  })
})

describe('useConmutarElLive', () => {
  function envoltorio({ children }: { children: ReactNode }) {
    return (
      <ProveedorDelLive puedeEncender enElServidor={false}>
        {children}
      </ProveedorDelLive>
    )
  }

  it('conmutar escribe la cookie y vuelve a pedir la pantalla', () => {
    document.cookie = 'modo-live=0; Path=/'
    const { result } = renderHook(() => useConmutarElLive(), { wrapper: envoltorio })
    expect(result.current.puedeEncender).toBe(true)
    act(() => {
      result.current.alternar()
    })
    expect(result.current.live).toBe(true)
    expect(cookie()).toBe('1')
    expect(localStorage.getItem(CLAVE_LIVE)).toBe('1')
    expect(router.refresh).toHaveBeenCalledTimes(1)
    act(() => {
      result.current.salir()
    })
    expect(result.current.live).toBe(false)
    expect(cookie()).toBe('0')
    expect(router.refresh).toHaveBeenCalledTimes(2)
  })

  it('fuera del proveedor no se puede encender', () => {
    const { result } = renderHook(() => useConmutarElLive())
    expect(result.current.puedeEncender).toBe(false)
  })
})
