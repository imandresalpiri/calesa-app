import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Drawer } from './drawer'

afterEach(cleanup)

const abrir = (props: { alto?: 'ajustable'; lado?: 'bottom' | 'right' }) => {
  render(
    <Drawer abierto alCerrar={() => undefined} titulo="Panel" lado="bottom" {...props}>
      <p>Adentro</p>
    </Drawer>,
  )
}

describe('un Drawer de abajo con alto ajustable', () => {
  it('lleva un asa con el alto de hoy (60) y ↑/↓ lo cambian de 5 en 5', () => {
    abrir({ alto: 'ajustable' })
    const asa = screen.getByRole('separator', { name: 'Cambiar el alto del panel' })
    expect(asa).toHaveAttribute('aria-valuenow', '60')
    fireEvent.keyDown(asa, { key: 'ArrowUp' })
    expect(asa).toHaveAttribute('aria-valuenow', '65')
    fireEvent.keyDown(asa, { key: 'ArrowDown' })
    fireEvent.keyDown(asa, { key: 'ArrowDown' })
    expect(asa).toHaveAttribute('aria-valuenow', '55')
  })

  it('Inicio y Fin van a los extremos', () => {
    abrir({ alto: 'ajustable' })
    const asa = screen.getByRole('separator')
    fireEvent.keyDown(asa, { key: 'End' })
    expect(asa).toHaveAttribute('aria-valuenow', '95')
    fireEvent.keyDown(asa, { key: 'Home' })
    expect(asa).toHaveAttribute('aria-valuenow', '30')
  })

  it('sin `alto="ajustable"` no hay asa', () => {
    abrir({})
    expect(screen.queryByRole('separator')).toBeNull()
  })

  it('al costado tampoco: la prop sólo vale con `lado="bottom"`', () => {
    abrir({ alto: 'ajustable', lado: 'right' })
    expect(screen.queryByRole('separator')).toBeNull()
  })
})
