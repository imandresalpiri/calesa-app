import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ProveedorDeCompartirLaAprobada } from '../hooks/compartir-de-la-aprobada'
import { CeldaDeCostoEstimado, CostoEstimado } from './costo-estimado'

const COTIZACION = '33333333-3333-4333-8333-333333333333'
const aprobada = (monto: string | null, modo: string | null = 'Unificado') => ({
  cotizacionId: COTIZACION,
  monto,
  moneda: 'USD',
  modo,
})

afterEach(() => {
  cleanup()
  document.documentElement.classList.remove('live')
})

describe('«Costo estimado»', () => {
  it('es un botón que comparte la aprobada, con su monto y modo en el nombre', () => {
    const compartir = vi.fn()
    render(
      <ProveedorDeCompartirLaAprobada compartir={compartir}>
        <CostoEstimado aprobada={aprobada('27999')} />
      </ProveedorDeCompartirLaAprobada>,
    )
    const boton = screen.getByRole('button', {
      name: /^Compartir la cotización aprobada \(.*27.999.* · Unificado\)$/,
    })
    fireEvent.click(boton)
    expect(compartir).toHaveBeenCalledWith(COTIZACION)
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('sin total, «Sin total» también comparte', () => {
    render(
      <ProveedorDeCompartirLaAprobada compartir={() => undefined}>
        <CeldaDeCostoEstimado aprobada={aprobada(null)} />
      </ProveedorDeCompartirLaAprobada>,
    )
    expect(
      screen.getByRole('button', { name: 'Compartir la cotización aprobada (Sin total)' }),
    ).toBeTruthy()
  })

  it('sin aprobada, «—» sin botón', () => {
    render(
      <ProveedorDeCompartirLaAprobada compartir={() => undefined}>
        <CostoEstimado aprobada={null} />
      </ProveedorDeCompartirLaAprobada>,
    )
    expect(screen.getByText('—')).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('en Modo Live sigue siendo el botón, con el número sin su moneda en el nombre', () => {
    document.documentElement.classList.add('live')
    render(
      <ProveedorDeCompartirLaAprobada compartir={() => undefined}>
        <CostoEstimado aprobada={aprobada('27999')} />
      </ProveedorDeCompartirLaAprobada>,
    )
    expect(
      screen.getByRole('button', {
        name: /^Compartir la cotización aprobada \([\d.,]*27.999[\d.,]* · Unificado\)$/,
      }),
    ).toBeTruthy()
  })

  it('sin cómo compartir, es texto', () => {
    render(<CostoEstimado aprobada={aprobada('27999')} />)
    expect(screen.queryByRole('button')).toBeNull()
  })
})
