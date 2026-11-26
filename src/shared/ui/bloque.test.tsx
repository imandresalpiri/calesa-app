import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Bloque } from './bloque'
import { BloquesALaVista } from './bloques-a-la-vista'

afterEach(cleanup)

describe('<Bloque>', () => {
  it('siempre es una sección a la vista con su h3, sin <details>', () => {
    const { container } = render(
      <Bloque titulo="Datos">
        <p>Nombre</p>
      </Bloque>,
    )
    expect(container.querySelector('details')).toBeNull()
    expect(screen.getByRole('heading', { level: 3, name: 'Datos' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Datos' })).toHaveTextContent('Nombre')
  })

  it('el nivel sale de <BloquesALaVista>', () => {
    render(
      <BloquesALaVista nivel={2}>
        <Bloque titulo="Datos">
          <p>Nombre</p>
        </Bloque>
      </BloquesALaVista>,
    )
    expect(screen.getByRole('heading', { level: 2, name: 'Datos' })).toBeInTheDocument()
  })

  it('anidado, el de adentro lleva h4', () => {
    render(
      <Bloque titulo="Datos">
        <Bloque titulo="Identidad">
          <p>Nombre</p>
        </Bloque>
      </Bloque>,
    )
    expect(screen.getByRole('heading', { level: 3, name: 'Datos' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 4, name: 'Identidad' })).toBeInTheDocument()
  })

  it('no se puede plegar', () => {
    render(
      // @ts-expect-error: `<Bloque>` no tiene `plegado`.
      <Bloque titulo="Demora" plegado>
        <p>Días</p>
      </Bloque>,
    )
    expect(screen.getByText('Días')).toBeVisible()
  })
})
