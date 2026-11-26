import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MOTIVO_DE_PUBLICAR, PublicarDelBorrador } from './publicar-del-borrador'

afterEach(cleanup)

describe('PublicarDelBorrador', () => {
  it('fuera de la barra se dibuja en su lugar y abre lo que le pasan', () => {
    const alPublicar = vi.fn()
    render(<PublicarDelBorrador alPublicar={alPublicar} espera={false} />)
    fireEvent.click(screen.getByRole('button', { name: 'Publicar…' }))
    expect(alPublicar).toHaveBeenCalledTimes(1)
    expect(screen.queryByText(MOTIVO_DE_PUBLICAR)).toBeNull()
  })

  it('con cambios aplicados sin guardar, espera y dice por qué al lado', () => {
    const alPublicar = vi.fn()
    render(<PublicarDelBorrador alPublicar={alPublicar} espera />)
    const publicar = screen.getByRole('button', { name: 'Publicar…' }) as HTMLButtonElement
    expect(publicar.disabled).toBe(true)
    const motivo = screen.getByText(MOTIVO_DE_PUBLICAR)
    expect(publicar.getAttribute('aria-describedby')).toBe(motivo.id)
    fireEvent.click(publicar)
    expect(alPublicar).not.toHaveBeenCalled()
  })
})
