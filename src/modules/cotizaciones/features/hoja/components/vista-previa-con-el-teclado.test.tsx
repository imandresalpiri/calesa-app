import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { NuqsTestingAdapter, type OnUrlUpdateFunction } from 'nuqs/adapters/testing'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ContextoDeLaVistaPrevia } from './hueco-de-la-vista-previa'
import { VistaPreviaConElTeclado } from './vista-previa-con-el-teclado'

afterEach(cleanup)

// La hoja nueva sin el resumen: «Vista previa» tiene que poder abrirse con el teclado (el paso va fuera del orden de Tab).
describe('<VistaPreviaConElTeclado>', () => {
  it('con el hueco, un botón en el orden de Tab que abre ?panel=vista-previa', async () => {
    const alActualizar = vi.fn<OnUrlUpdateFunction>()
    render(
      <ContextoDeLaVistaPrevia value={{ dibujar: () => null }}>
        <NuqsTestingAdapter onUrlUpdate={alActualizar}>
          <VistaPreviaConElTeclado />
        </NuqsTestingAdapter>
      </ContextoDeLaVistaPrevia>,
    )
    const boton = screen.getByRole('button', { name: 'Vista previa' })
    expect(boton.tabIndex).toBe(0)
    fireEvent.click(boton)
    await waitFor(() =>
      expect(alActualizar.mock.lastCall?.[0].queryString).toContain('panel=vista-previa'),
    )
  })

  it('sin el hueco, nada', () => {
    const { container } = render(
      <NuqsTestingAdapter>
        <VistaPreviaConElTeclado />
      </NuqsTestingAdapter>,
    )
    expect(container.innerHTML).toBe('')
  })
})
