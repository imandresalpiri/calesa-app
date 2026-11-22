import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { NuqsTestingAdapter } from 'nuqs/adapters/testing'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ResumenDeQuienCrea } from './resumen-de-quien-crea'

// El cuadro de verdad se prueba en `quien-crea-y-quien-ve.test.tsx`: acá sólo si se monta y cuándo.
vi.mock('./diferidos', () => ({
  QuienCreaYQuienVeDiferido: () => <div data-testid="cuadro">el cuadro</div>,
}))

const versiones = { de: (_: string, base: string) => base, poner: vi.fn() }

function resumen(url = '') {
  render(
    <NuqsTestingAdapter searchParams={url}>
      <ResumenDeQuienCrea
        roles={[]}
        origenes={[]}
        misPermisos={[]}
        puedeGestionar
        versiones={versiones}
      />
    </NuqsTestingAdapter>,
  )
}

afterEach(cleanup)

describe('ResumenDeQuienCrea', () => {
  it('entra cerrado y no pide el cuadro', () => {
    resumen()
    const boton = screen.getByRole('button', { name: 'Quién crea y quién ve' })
    expect(boton).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByTestId('cuadro')).toBeNull()
  })

  it('al tocarlo se abre, monta el cuadro y apunta a él con aria-controls', () => {
    resumen()
    const boton = screen.getByRole('button', { name: 'Quién crea y quién ve' })
    fireEvent.click(boton)
    expect(boton).toHaveAttribute('aria-expanded', 'true')
    const cuadro = screen.getByTestId('cuadro')
    expect(cuadro.parentElement).toHaveAttribute('id', boton.getAttribute('aria-controls'))
    expect(cuadro.parentElement).not.toHaveAttribute('hidden')
  })

  it('vuelve a plegarse sin desmontar lo que ya cargó', () => {
    resumen()
    const boton = screen.getByRole('button', { name: 'Quién crea y quién ve' })
    fireEvent.click(boton)
    fireEvent.click(boton)
    expect(boton).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByTestId('cuadro').parentElement).toHaveAttribute('hidden')
  })

  it('con `?origen=` en la URL llega desplegado', () => {
    resumen('?origen=22222222-2222-4222-8222-222222222222')
    expect(screen.getByRole('button', { name: 'Quién crea y quién ve' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    expect(screen.getByTestId('cuadro')).toBeInTheDocument()
  })
})
