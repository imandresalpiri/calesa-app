import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { NuqsTestingAdapter, type UrlUpdateEvent } from 'nuqs/adapters/testing'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BotonDeLaInformacion } from './boton-de-la-informacion'

afterEach(cleanup)

function montar(marca: { texto: string } | null, alCambiarUrl?: (e: UrlUpdateEvent) => void) {
  render(
    <NuqsTestingAdapter {...(alCambiarUrl ? { onUrlUpdate: alCambiarUrl } : {})}>
      <BotonDeLaInformacion marca={marca} />
    </NuqsTestingAdapter>,
  )
}

describe('BotonDeLaInformacion', () => {
  it('fuera de la barra lleva su nombre a la vista y, sin nada que marcar, ninguna descripción', () => {
    montar(null)
    const boton = screen.getByRole('button', { name: 'Información de la fórmula' })
    expect(boton.getAttribute('aria-describedby')).toBeNull()
    expect(boton.querySelector('[data-marca-de-la-informacion]')).toBeNull()
  })

  it('con algo que bloquea, la marca y su texto para el lector', () => {
    const texto = 'Japón no tiene una versión publicada: no se puede cotizar en él.'
    montar({ texto })
    const boton = screen.getByRole('button', { name: 'Información de la fórmula' })
    expect(boton.querySelector('[data-marca-de-la-informacion]')).not.toBeNull()
    const id = boton.getAttribute('aria-describedby') ?? ''
    expect(document.getElementById(id)?.textContent).toBe(texto)
  })

  it('abre el modal en la URL', async () => {
    const alCambiarUrl = vi.fn<(e: UrlUpdateEvent) => void>()
    montar(null, alCambiarUrl)
    fireEvent.click(screen.getByRole('button', { name: 'Información de la fórmula' }))
    await waitFor(() => {
      expect(alCambiarUrl).toHaveBeenCalled()
    })
    expect(alCambiarUrl.mock.calls.at(-1)?.[0].searchParams.get('panel')).toBe('info-formula')
  })
})
