import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { firmaEnElCursor } from '../../../../../entities/formula/firma-en-el-cursor'
import type { Planilla } from '../../../hooks/use-planilla'
import { GUIA_DE_TOCAR, NOMBRE_DE_SIGUIENTE, RenglonDeLaEdicion } from './renglon-de-la-edicion'

const siguienteLugar = vi.fn(() => true)
const conGuia = (guia: Planilla['guia']) =>
  ({ prefijo: 'p', guia, edicion: { siguienteLugar } }) as unknown as Planilla

describe('RenglonDeLaEdicion', () => {
  it('la firma con el valor que se escribe en negrita, y su texto entero en el title', () => {
    render(
      <RenglonDeLaEdicion
        planilla={conGuia({
          firma: firmaEnElCursor('=SI(C3>0; ', 10),
          esperaCelda: true,
          quedanLugares: false,
        })}
      />,
    )
    const firma = document.getElementById('p-firma')
    expect(firma).toHaveTextContent('SI(condición; si se cumple; si no)')
    expect(firma).toHaveAttribute('title', 'SI(condición; si se cumple; si no)')
    expect(screen.getByText('si se cumple').tagName).toBe('STRONG')
    // Con la firma, la guía de tocar no se dice.
    expect(screen.queryByText(GUIA_DE_TOCAR)).toBeNull()
  })

  it('sin firma y esperando un operando, la guía de tocar', () => {
    render(
      <RenglonDeLaEdicion
        planilla={conGuia({ firma: null, esperaCelda: true, quedanLugares: false })}
      />,
    )
    expect(screen.getByText(GUIA_DE_TOCAR)).toBeInTheDocument()
  })

  it('sin nada que decir, el renglón queda reservado y vacío', () => {
    const { container } = render(
      <RenglonDeLaEdicion
        planilla={conGuia({ firma: null, esperaCelda: false, quedanLugares: false })}
      />,
    )
    const renglon = container.querySelector('[data-renglon-de-la-edicion]')
    expect(renglon).toBeEmptyDOMElement()
    expect(renglon?.className).toContain('min-h-[1lh]')
  })

  it('«Siguiente» sólo con lugares por llenar, y lleva al siguiente', () => {
    const { rerender } = render(
      <RenglonDeLaEdicion
        planilla={conGuia({ firma: null, esperaCelda: true, quedanLugares: false })}
      />,
    )
    expect(screen.queryByRole('button', { name: NOMBRE_DE_SIGUIENTE })).toBeNull()
    rerender(
      <RenglonDeLaEdicion
        planilla={conGuia({ firma: null, esperaCelda: true, quedanLugares: true })}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: NOMBRE_DE_SIGUIENTE }))
    expect(siguienteLugar).toHaveBeenCalledOnce()
  })
})
