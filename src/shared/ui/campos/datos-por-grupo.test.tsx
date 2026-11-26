import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DatosPorGrupo } from './datos-por-grupo'

const campos = [
  {
    clave: 'ciudad',
    etiqueta: 'Ciudad',
    grupo: 'Contacto',
    activo: true,
    tipo: 'texto',
    opciones: null,
  },
  {
    clave: 'presupuesto',
    etiqueta: 'Presupuesto',
    grupo: null,
    activo: true,
    tipo: 'texto',
    opciones: null,
  },
] as const

describe('DatosPorGrupo', () => {
  it('cada grupo a la vista con su `h3`, sin nada que plegar', () => {
    const { container } = render(
      <DatosPorGrupo
        campos={campos as never}
        atributos={{ ciudad: 'La Paz', presupuesto: 'Alto' }}
      />,
    )
    expect(container.querySelector('details')).toBeNull()
    expect(screen.getByRole('heading', { level: 3, name: 'Contacto' })).toBeTruthy()
    expect(screen.getByRole('heading', { level: 3, name: 'Otros datos' })).toBeTruthy()
    expect(screen.getByText('La Paz')).toBeTruthy()
  })
})
