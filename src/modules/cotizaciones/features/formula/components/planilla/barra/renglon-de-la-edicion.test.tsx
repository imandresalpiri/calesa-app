import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { firmaEnElCursor } from '../../../../../entities/formula/firma-en-el-cursor'
import type { Planilla } from '../../../hooks/use-planilla'
import { GUIA_DE_ELEGIR, MOTIVO_SIN_SIGNO } from '../../../hooks/use-eleccion-de-celda'
import { NOMBRE_DE_ELEGIR } from './eleccion-de-celda'
import { GUIA_DE_TOCAR, NOMBRE_DE_SIGUIENTE, RenglonDeLaEdicion } from './renglon-de-la-edicion'

const siguienteLugar = vi.fn(() => true)
const salir = vi.fn()
const conGuia = (
  guia: Planilla['guia'],
  eligiendo: Partial<Planilla['eligiendo']> = { enC: false, activo: false, motivo: null },
) =>
  ({
    prefijo: 'p',
    guia,
    edicion: { siguienteLugar },
    eligiendo: { entrar: vi.fn(), salir, ...eligiendo },
  }) as unknown as Planilla

describe('RenglonDeLaEdicion', () => {
  afterEach(() => {
    cleanup()
  })

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
    expect(renglon?.className).toContain('min-h-7')
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

describe('RenglonDeLaEdicion con «Elegir celda»', () => {
  afterEach(() => {
    cleanup()
  })

  it('eligiendo una celda: el renglón sólo dice qué tocar, con «Cancelar»', () => {
    render(
      <RenglonDeLaEdicion
        planilla={conGuia(
          { firma: firmaEnElCursor('=SI(', 4), esperaCelda: true, quedanLugares: true },
          { enC: true, activo: true, motivo: null },
        )}
      />,
    )
    expect(screen.getByText(GUIA_DE_ELEGIR)).toBeInTheDocument()
    expect(document.getElementById('p-firma')).toBeNull()
    expect(screen.queryByRole('button', { name: NOMBRE_DE_SIGUIENTE })).toBeNull()
    expect(screen.getByRole('button', { name: NOMBRE_DE_ELEGIR })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(salir).toHaveBeenCalledOnce()
  })

  it('«Elegir celda» apagado dice por qué', () => {
    render(
      <RenglonDeLaEdicion
        planilla={conGuia(
          { firma: null, esperaCelda: false, quedanLugares: false },
          { enC: true, activo: false, motivo: MOTIVO_SIN_SIGNO },
        )}
      />,
    )
    const elegir = screen.getByRole('button', { name: NOMBRE_DE_ELEGIR })
    expect(elegir).toHaveAttribute('aria-disabled', 'true')
    expect(elegir).toHaveAttribute('title', MOTIVO_SIN_SIGNO)
  })
})
