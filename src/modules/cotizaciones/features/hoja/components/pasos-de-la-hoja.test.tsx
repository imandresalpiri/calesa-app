import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { NuqsTestingAdapter, type UrlUpdateEvent } from 'nuqs/adapters/testing'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ContextoDeLaVistaPrevia } from './hueco-de-la-vista-previa'
import { PasosDeLaHoja } from './pasos-de-la-hoja'

function montar({
  privada = <button type="button">Privada</button>,
  vistaPrevia = true,
}: { privada?: ReactNode; vistaPrevia?: boolean } = {}) {
  const cambios = vi.fn<(e: UrlUpdateEvent) => void>()
  const nav = <PasosDeLaHoja privada={privada} />
  render(
    <NuqsTestingAdapter onUrlUpdate={cambios}>
      {vistaPrevia ? (
        <ContextoDeLaVistaPrevia value={{ dibujar: () => null } as never}>
          {nav}
        </ContextoDeLaVistaPrevia>
      ) : (
        nav
      )}
    </NuqsTestingAdapter>,
  )
  return cambios
}

afterEach(cleanup)

describe('PasosDeLaHoja', () => {
  it('«Privada · Vista previa», sin «Hoja», «Vehículo» ni «Cliente»', () => {
    montar()
    const nav = screen.getByRole('navigation', { name: 'Pasos de la hoja' })
    expect([...nav.querySelectorAll('[data-paso]')].map((p) => p.textContent)).toEqual([
      'Privada',
      'Vista previa',
    ])
    for (const quitado of ['Hoja', 'Vehículo', 'Cliente']) {
      expect(screen.queryByRole('button', { name: quitado })).toBeNull()
    }
    expect(screen.getByRole('button', { name: 'Vista previa' }).tabIndex).toBe(-1)
  })

  it('«Vista previa» abre su panel por la URL', async () => {
    const cambios = montar()
    fireEvent.click(screen.getByRole('button', { name: 'Vista previa' }))
    await waitFor(() => {
      expect(cambios.mock.calls.at(-1)?.[0].searchParams.get('panel')).toBe('vista-previa')
    })
  })

  it('sin el interruptor (quien no puede marcarla, una guardada), sólo «Vista previa»', () => {
    montar({ privada: null })
    const nav = screen.getByRole('navigation', { name: 'Pasos de la hoja' })
    expect(nav.textContent).toBe('Vista previa')
  })

  it('sin interruptor ni vista previa, la fila no se dibuja', () => {
    montar({ privada: null, vistaPrevia: false })
    expect(screen.queryByRole('navigation', { name: 'Pasos de la hoja' })).toBeNull()
  })
})
