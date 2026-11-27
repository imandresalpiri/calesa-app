import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { HuecoMoverElGrupo } from './hueco-mover-el-grupo'

const C = '6a1f5d3e-8c2b-4a7e-9f10-2b3c4d5e6f70'

describe('el hueco «Mover el contenedor»', () => {
  afterEach(cleanup)

  it('el contenedor lleva al lote con sus unidades, por su id', () => {
    render(<HuecoMoverElGrupo grupo={{ tipo: 'contenedor', id: C }} />)
    const enlace = screen.getByRole('link', { name: 'Marcar que llegó' })
    expect(enlace.getAttribute('href')).toBe(`/logistica?panel=lote&contenedor=${C}`)
  })

  it('con el origen de la pestaña, va a la Cadena de ese origen', () => {
    render(<HuecoMoverElGrupo grupo={{ tipo: 'contenedor', id: C, origenId: 'o1' }} />)
    const enlace = screen.getByRole('link', { name: 'Marcar que llegó' })
    expect(enlace.getAttribute('href')).toBe(`/logistica?origen=o1&panel=lote&contenedor=${C}`)
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
