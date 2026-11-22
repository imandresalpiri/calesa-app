import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PoliticaDeLaCola } from '../../../../entities/cola/politica'
import { guardarPoliticaDeLaCola } from '../actions/guardar-politica'
import { ModalDeLaPolitica } from './modal-de-la-politica'

// El modal «Política de la cola»: sus cinco campos parten de lo guardado, guardar manda la versión, un rechazo va junto a su campo y un conflicto deja
// «Recargar» sin perder lo tipeado.
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
vi.mock('../actions/guardar-politica', () => ({ guardarPoliticaDeLaCola: vi.fn() }))
vi.mock('@/shared/ui/toasts', () => ({
  avisar: vi.fn(),
  avisarError: vi.fn(),
  avisarExito: vi.fn(),
}))

const guardar = vi.mocked(guardarPoliticaDeLaCola)

const POLITICA: PoliticaDeLaCola = {
  colaActiva: true,
  ttlContactoMinutos: 30,
  diasPegajoso: 14,
  maxAbiertasDefault: 5,
  maxIntentos: 3,
  whatsappRespaldo: '+59170000000',
  actualizadoEn: '2026-10-12T14:00:00.123456+00:00',
}

const minutos = () => screen.getByLabelText<HTMLInputElement>('Minutos para contactar')

function abrir(alCerrar = vi.fn()) {
  render(<ModalDeLaPolitica abierto alCerrar={alCerrar} politica={POLITICA} />)
  return alCerrar
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('ModalDeLaPolitica', () => {
  it('lleva el interruptor y los cuatro números, partiendo de lo guardado', () => {
    abrir()
    expect(screen.getByRole('dialog', { name: 'Política de la cola' })).toBeTruthy()
    expect(screen.getByRole('switch', { name: /La cola reparte turnos/ }).ariaChecked).toBe('true')
    expect(minutos().value).toBe('30')
    expect(screen.getByLabelText<HTMLInputElement>('Cupo por defecto').value).toBe('5')
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeTruthy()
  })

  it('«Guardar» manda las cinco claves con la versión y cierra', async () => {
    guardar.mockResolvedValueOnce({
      data: { ok: true, data: { actualizadoEn: '2026-10-12T15:00:00.000000+00:00' } },
    } as never)
    const alCerrar = abrir()
    fireEvent.change(minutos(), { target: { value: '45' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    await vi.waitFor(() => {
      expect(guardar).toHaveBeenCalledTimes(1)
    })
    expect(guardar.mock.calls[0]?.[0]).toEqual({
      colaActiva: true,
      ttlContactoMinutos: 45,
      diasPegajoso: 14,
      maxAbiertasDefault: 5,
      maxIntentos: 3,
      actualizadoEnEsperado: POLITICA.actualizadoEn,
    })
    await vi.waitFor(() => {
      expect(alCerrar).toHaveBeenCalledTimes(1)
    })
  })

  it('un número fuera de rango no se envía y su motivo queda junto al campo', async () => {
    abrir()
    fireEvent.change(minutos(), { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    await vi.waitFor(() => {
      expect(screen.getByText('Escribe un número entero entre 5 y 1440.')).toBeTruthy()
    })
    expect(guardar).not.toHaveBeenCalled()
  })

  it('un conflicto deja «Recargar» y conserva lo tipeado', async () => {
    guardar.mockResolvedValueOnce({
      data: {
        ok: false,
        error: { codigo: 'conflicto', mensaje: 'Otra persona cambió la política.' },
      },
    } as never)
    abrir()
    fireEvent.change(minutos(), { target: { value: '45' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    await vi.waitFor(() => {
      expect(screen.getByRole('button', { name: 'Recargar' })).toBeTruthy()
    })
    expect(minutos().value).toBe('45')
  })

  it('sin cambios, «Guardar» cierra sin escribir', async () => {
    const alCerrar = abrir()
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    await vi.waitFor(() => {
      expect(alCerrar).toHaveBeenCalledTimes(1)
    })
    expect(guardar).not.toHaveBeenCalled()
  })

  it('cerrar con cambios pregunta antes de descartar', () => {
    const alCerrar = abrir()
    fireEvent.change(minutos(), { target: { value: '45' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(alCerrar).not.toHaveBeenCalled()
    expect(screen.getByText(/cambios sin guardar/i)).toBeTruthy()
  })
})
