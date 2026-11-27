import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { HuecoMoverElGrupo } from './hueco-mover-el-grupo'

describe('el hueco «Mover el grupo»', () => {
  afterEach(cleanup)

  it('el contenedor lleva al lote con sus unidades', () => {
    render(<HuecoMoverElGrupo grupo={{ tipo: 'contenedor', id: 'MSKU 123/4' }} />)
    const enlace = screen.getByRole('link', { name: 'Marcar que llegó' })
    expect(enlace.getAttribute('href')).toBe('/logistica?panel=lote&contenedor=MSKU+123%2F4')
  })

  it('con el origen de la pestaña, va a la Cadena de ese origen', () => {
    render(<HuecoMoverElGrupo grupo={{ tipo: 'contenedor', id: 'MSKU1234', origenId: 'o1' }} />)
    const enlace = screen.getByRole('link', { name: 'Marcar que llegó' })
    expect(enlace.getAttribute('href')).toBe('/logistica?panel=lote&contenedor=MSKU1234&origen=o1')
  })

  it('un embarque o una declaración no tienen nada que mover aquí', () => {
    const { container, rerender } = render(
      <HuecoMoverElGrupo grupo={{ tipo: 'embarque', id: 'e1' }} />,
    )
    expect(container).toBeEmptyDOMElement()
    rerender(<HuecoMoverElGrupo grupo={{ tipo: 'declaracion', id: 'd1' }} />)
    expect(container).toBeEmptyDOMElement()
  })
})
