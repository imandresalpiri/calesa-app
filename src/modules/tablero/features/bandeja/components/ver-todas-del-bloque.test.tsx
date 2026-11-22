import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { VerTodasDelBloque } from './ver-todas-del-bloque'

describe('VerTodasDelBloque', () => {
  it('sin llegar al tope no dibuja nada', () => {
    const { container } = render(
      <VerTodasDelBloque bloque={{ verTodos: 'Ver todos' }} ruta="/leads" hayMas={false} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('en el tope dibuja el enlace con el texto del bloque, a la ruta ya filtrada', () => {
    render(
      <VerTodasDelBloque
        bloque={{ verTodos: 'Ver todas' }}
        ruta="/configuracion/equipo?estado=sin_rol"
        hayMas
      />,
    )
    const enlace = screen.getByRole('link', { name: 'Ver todas' })
    expect(enlace.getAttribute('href')).toBe('/configuracion/equipo?estado=sin_rol')
  })

  it('si quien mira no puede abrir el destino no hay enlace, aunque haya más', () => {
    const { container } = render(
      <VerTodasDelBloque
        bloque={{ verTodos: 'Ver todos' }}
        ruta="/repuestos"
        hayMas
        puedeAbrir={false}
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
