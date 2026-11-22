import { cleanup, render, screen, within } from '@testing-library/react'
import { withNuqsTestingAdapter } from 'nuqs/adapters/testing'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TarjetaDeLaSerie } from './tarjeta-de-la-serie'

// La action toca el servidor: acá no se guarda nada.
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock('../actions/cambiar-serie', () => ({ cambiarSerie: vi.fn() }))

const VIGENTE = { serie: 'A', ultimo: 12, actualizadoEn: '2026-10-12T14:00:00+00:00' }

afterEach(cleanup)

function tarjeta(puedeCambiar: boolean) {
  const Con = withNuqsTestingAdapter()
  render(
    <Con>
      <TarjetaDeLaSerie vigente={VIGENTE} puedeCambiar={puedeCambiar} />
    </Con>,
  )
  return within(screen.getByRole('region', { name: 'Serie de comprobantes' }))
}

describe('TarjetaDeLaSerie', () => {
  it('muestra la serie vigente y el próximo comprobante', () => {
    const t = tarjeta(true)
    expect(t.getByText('A', { selector: '[data-serie-vigente]' })).toBeTruthy()
    expect(t.getByText('A-13', { selector: '[data-proximo-comprobante]' })).toBeTruthy()
    expect(t.getByRole('button', { name: 'Cambiar la serie' })).toBeTruthy()
    expect(t.getByRole('button', { name: 'Más acciones de Serie de comprobantes' })).toBeTruthy()
  })

  it('sin permiso se ve todo y no hay botón para cambiarla', () => {
    const t = tarjeta(false)
    expect(t.getByText('A-13')).toBeTruthy()
    expect(t.queryByRole('button', { name: 'Cambiar la serie' })).toBeNull()
    expect(t.getByRole('button', { name: 'Más acciones de Serie de comprobantes' })).toBeTruthy()
  })
})
