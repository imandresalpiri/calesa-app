import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Nodo } from '../../../../../entities/nodos'
import { FormularioDeDecimales } from './formulario-de-decimales'

afterEach(cleanup)

const espacios = (t: string | null | undefined) => (t ?? '').replace(/[\u00a0\u202f]/g, ' ')

// `<Monto>` dibuja también lo del Modo Live (el número sin moneda), que el CSS esconde: se lee sin esa versión.
const ejemplo = () => {
  const copia = document.querySelector('[data-ejemplo-de-decimales]')?.cloneNode(true)
  if (!(copia instanceof HTMLElement)) return ''
  copia.querySelectorAll('[data-monto-sin-moneda]').forEach((n) => {
    n.remove()
  })
  return espacios(copia.textContent)
}

const nodo = (n: { formato?: 'usd' | 'pct'; decimales?: number } = {}): Nodo => ({
  id: 'flete',
  tipo: 'constante',
  etiqueta: 'Flete',
  formato: 'usd',
  ...n,
})

const dibujar = (n: Nodo, alAplicar = vi.fn()) => {
  render(
    <FormularioDeDecimales nodo={n} motivo={null} alAplicar={alAplicar} alCancelar={vi.fn()} />,
  )
  return alAplicar
}

describe('FormularioDeDecimales', () => {
  it('sin la clave, «Automático» va marcado y el ejemplo dice lo de hoy a los dos lados', () => {
    dibujar(nodo())
    expect(screen.getByRole('radio', { name: 'Automático' })).toBeChecked()
    expect(screen.getAllByRole('radio').map((r) => r.getAttribute('value'))).toEqual([
      'automatico',
      '0',
      '1',
      '2',
      '3',
      '4',
    ])
    expect(ejemplo()).toMatch(/1\.234,57 → .*1\.234,57$/)
  })

  it('elegir 0 cambia el lado de la derecha y «Aplicar» lo manda; «Automático», `null`', () => {
    const alAplicar = dibujar(nodo())
    fireEvent.click(screen.getByRole('radio', { name: '0' }))
    expect(ejemplo()).toMatch(/1\.234,57 → .*1\.235$/)
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }))
    expect(alAplicar).toHaveBeenLastCalledWith(0)
    fireEvent.click(screen.getByRole('radio', { name: 'Automático' }))
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }))
    expect(alAplicar).toHaveBeenLastCalledWith(null)
  })

  it('un porcentaje cuenta en puntos y la celda abre con los suyos marcados', () => {
    dibujar(nodo({ formato: 'pct', decimales: 2 }))
    expect(screen.getByRole('radio', { name: '2' })).toBeChecked()
    expect(ejemplo()).toMatch(/14,95\s?%$/)
  })

  it('un rechazo se lee en su línea y el foco vuelve al radio elegido', () => {
    const { rerender } = render(
      <FormularioDeDecimales
        nodo={nodo({ decimales: 1 })}
        motivo={null}
        alAplicar={vi.fn()}
        alCancelar={vi.fn()}
      />,
    )
    rerender(
      <FormularioDeDecimales
        nodo={nodo({ decimales: 1 })}
        motivo="Aplica o descarta lo que escribes en la planilla."
        alAplicar={vi.fn()}
        alCancelar={vi.fn()}
      />,
    )
    expect(document.querySelector('[data-motivo-de-decimales]')).toHaveTextContent(
      'Aplica o descarta lo que escribes en la planilla.',
    )
    expect(screen.getByRole('radio', { name: '1' })).toHaveFocus()
  })
})
