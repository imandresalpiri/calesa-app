import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { avisar } from '@/shared/ui/toasts'
import type { InsercionEnLaBarra } from '../../../hooks/use-insercion-en-la-barra'
import { NOMBRE_DE_LA_AYUDA, OperacionesRapidas } from './operaciones-rapidas'

vi.mock('@/shared/ui/toasts', () => ({ avisar: vi.fn() }))

const insercion = (motivo: string | null): InsercionEnLaBarra => ({
  motivo,
  insertar: vi.fn(),
  insertarOperacion: vi.fn(),
})

describe('OperacionesRapidas', () => {
  afterEach(() => {
    cleanup()
  })

  it('cada operación inserta la suya; «¿Cómo se escribe?» abre la ayuda', () => {
    const i = insercion(null)
    const alAbrirLaAyuda = vi.fn()
    render(<OperacionesRapidas insercion={i} alAbrirLaAyuda={alAbrirLaAyuda} />)
    const grupo = screen.getByRole('group', { name: 'Operaciones' })
    expect(grupo).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Si… entonces…' }))
    expect(i.insertarOperacion).toHaveBeenCalledWith('si')
    fireEvent.click(screen.getByRole('button', { name: 'Porcentaje de' }))
    expect(i.insertarOperacion).toHaveBeenLastCalledWith('porcentaje')
    fireEvent.click(screen.getByRole('button', { name: NOMBRE_DE_LA_AYUDA }))
    expect(alAbrirLaAyuda).toHaveBeenCalledOnce()
  })

  it('apagadas, dicen por qué y no insertan; la ayuda sigue', () => {
    const i = insercion('Las funciones van en C.')
    const alAbrirLaAyuda = vi.fn()
    render(<OperacionesRapidas insercion={i} alAbrirLaAyuda={alAbrirLaAyuda} />)
    const sumar = screen.getByRole('button', { name: 'Sumar' })
    expect(sumar).toHaveAttribute('aria-disabled', 'true')
    expect(sumar).toHaveAttribute('title', 'Las funciones van en C.')
    fireEvent.click(sumar)
    expect(avisar).toHaveBeenCalledWith('Las funciones van en C.')
    expect(i.insertarOperacion).not.toHaveBeenCalled()
    const ayuda = screen.getByRole('button', { name: NOMBRE_DE_LA_AYUDA })
    expect(ayuda).not.toHaveAttribute('aria-disabled')
  })
})
