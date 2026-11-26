import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { NuqsTestingAdapter } from 'nuqs/adapters/testing'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BotonDeQuienCrea } from './boton-de-quien-crea'
import { ModalDeQuienCrea } from './modal-de-quien-crea'

// El cuadro de verdad se prueba en `quien-crea-y-quien-ve.test.tsx`: acá sólo si se monta y cuándo.
vi.mock('./diferidos', () => ({
  QuienCreaYQuienVeDiferido: () => <div data-testid="cuadro">el cuadro</div>,
}))

const versiones = { de: (_: string, base: string) => base, poner: vi.fn() }

function pantalla(url = '') {
  const alCambiar = vi.fn()
  render(
    <NuqsTestingAdapter searchParams={url} onUrlUpdate={alCambiar}>
      <BotonDeQuienCrea />
      <ModalDeQuienCrea
        roles={[]}
        origenes={[]}
        misPermisos={[]}
        puedeGestionar
        versiones={versiones}
      />
    </NuqsTestingAdapter>,
  )
  return alCambiar
}

afterEach(cleanup)

describe('Quién crea y quién ve en un modal', () => {
  it('entra cerrado: el botón no se despliega y el cuadro no se pide', () => {
    pantalla()
    const boton = screen.getByRole('button', { name: 'Ver quién crea y quién ve' })
    expect(boton).not.toHaveAttribute('aria-expanded')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByTestId('cuadro')).toBeNull()
  })

  it('el botón escribe `?panel=quien-crea-y-quien-ve` en la URL', async () => {
    const alCambiar = pantalla()
    fireEvent.click(screen.getByRole('button', { name: 'Ver quién crea y quién ve' }))
    await waitFor(() => {
      expect(alCambiar).toHaveBeenCalled()
    })
    const { searchParams } = alCambiar.mock.calls[0]?.[0] as { searchParams: URLSearchParams }
    expect(searchParams.get('panel')).toBe('quien-crea-y-quien-ve')
  })

  it('con el panel en la URL llega abierto con su título y el cuadro', () => {
    pantalla('?panel=quien-crea-y-quien-ve')
    expect(screen.getByRole('dialog', { name: 'Quién crea y quién ve' })).toBeInTheDocument()
    expect(screen.getByTestId('cuadro')).toBeInTheDocument()
  })

  it('con `?origen=` solo (una URL vieja) no abre nada', () => {
    pantalla('?origen=22222222-2222-4222-8222-222222222222')
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
