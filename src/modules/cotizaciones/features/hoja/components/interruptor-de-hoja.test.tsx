import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { InterruptorDeHoja as Interruptor } from '../../../entities/hoja'
import { InterruptorDeHoja } from './interruptor-de-hoja'

afterEach(cleanup)

const ITEM: Interruptor = {
  tipo: 'interruptor',
  nodo: 'cuenta',
  etiqueta: 'Cuenta especial USA',
  efecto: 'habilita',
  editable: true,
  motivo: null,
  soloEn: null,
}

describe('el interruptor de la hoja, como en V1', () => {
  it('el switch y su rótulo a la derecha, en un label: el clic en el rótulo conmuta; qué hace es su descripción, sin escribirse', () => {
    const alCambiar = vi.fn()
    const { container } = render(
      <InterruptorDeHoja
        item={ITEM}
        encendido={false}
        fueraDeVariante={false}
        alCambiar={alCambiar}
      />,
    )
    const raiz = container.firstElementChild
    expect(raiz?.tagName).toBe('LABEL')
    const interruptor = screen.getByRole('switch', { name: 'Cuenta especial USA' })
    expect(raiz?.firstElementChild).toBe(interruptor)
    expect(interruptor).toHaveAccessibleDescription(
      'Habilita las celdas que dependen de este dato.',
    )
    expect(screen.getByText('Habilita las celdas que dependen de este dato.').hidden).toBe(true)
    fireEvent.click(screen.getByText('Cuenta especial USA'))
    expect(alCambiar).toHaveBeenCalledExactlyOnceWith('cuenta', true)
  })

  it('apagado: el motivo va escrito bajo el rótulo y no se pulsa', () => {
    const alCambiar = vi.fn()
    render(
      <InterruptorDeHoja item={ITEM} encendido={false} fueraDeVariante alCambiar={alCambiar} />,
    )
    const interruptor = screen.getByRole('switch', { name: 'Cuenta especial USA' })
    expect(screen.getByText('No aplica a esta variante.')).toBeTruthy()
    expect(interruptor).toHaveAccessibleDescription('No aplica a esta variante.')
    fireEvent.click(interruptor)
    expect(alCambiar).not.toHaveBeenCalled()
  })
})
