import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { firmaEnElCursor } from '../../../../../entities/formula/firma-en-el-cursor'
import type { Planilla } from '../../../hooks/use-planilla'
import { GUIA_DE_TOCAR, RenglonDeLaEdicion } from './renglon-de-la-edicion'

const conGuia = (guia: Planilla['guia']) => ({ prefijo: 'p', guia }) as unknown as Planilla

describe('RenglonDeLaEdicion', () => {
  it('la firma con el valor que se escribe en negrita, y su texto entero en el title', () => {
    render(
      <RenglonDeLaEdicion
        planilla={conGuia({ firma: firmaEnElCursor('=SI(C3>0; ', 10), esperaCelda: true })}
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
    render(<RenglonDeLaEdicion planilla={conGuia({ firma: null, esperaCelda: true })} />)
    expect(screen.getByText(GUIA_DE_TOCAR)).toBeInTheDocument()
  })

  it('sin nada que decir, el renglón queda reservado y vacío', () => {
    const { container } = render(
      <RenglonDeLaEdicion planilla={conGuia({ firma: null, esperaCelda: false })} />,
    )
    const renglon = container.querySelector('[data-renglon-de-la-edicion]')
    expect(renglon).toBeEmptyDOMElement()
    expect(renglon?.className).toContain('min-h-[1lh]')
  })
})
