import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { hojaDePrueba } from '../../../entities/hoja-de-prueba.soporte'
import { CabeceraDeHoja } from './cabecera-de-hoja'
import { ContextoDeLaRanuraDeLaCabecera } from './ranura-de-la-cabecera/contexto'
import {
  CabeceraQuieta,
  ProveedorDeLaRanuraDeLaCabecera,
  RanuraDeLaCabecera,
} from './ranura-de-la-cabecera'

const MODOS = [
  { clave: 'paralelo', nombre: 'Paralelo' },
  { clave: 'unificado', nombre: 'Unificado' },
]

function Cabecera() {
  const hoja = hojaDePrueba({ modos: MODOS })
  return (
    <CabeceraDeHoja
      cabecera={hoja.cabecera}
      modoElegido="paralelo"
      alElegirModo={vi.fn()}
      verTotalBs={false}
      alCambiarVerTotalBs={vi.fn()}
    />
  )
}

afterEach(cleanup)

// La ranura de la cabecera (glosario): la cabecera de la hoja va por un portal a la fila de las barras; sin proveedor, en su lugar.
describe('CabeceraDeHoja y la ranura de la cabecera', () => {
  it('sin proveedor se dibuja en su lugar', () => {
    const { container } = render(
      <div data-lugar="">
        <Cabecera />
      </div>,
    )
    expect(container.querySelector('[data-lugar] > [data-cabecera]')).not.toBeNull()
  })

  it('con proveedor y la ranura sin montar no se dibuja en ningún lado', () => {
    render(
      <ContextoDeLaRanuraDeLaCabecera value={{ poner: vi.fn(), elemento: null }}>
        <Cabecera />
      </ContextoDeLaRanuraDeLaCabecera>,
    )
    expect(document.querySelector('[data-cabecera]')).toBeNull()
  })

  it('con la ranura montada va dentro de ella, lejos de la hoja, y la reserva queda detrás, para esconderse por CSS', () => {
    render(
      <ProveedorDeLaRanuraDeLaCabecera>
        <RanuraDeLaCabecera reserva={<span data-reserva="" />} />
        <div data-hoja="">
          <Cabecera />
        </div>
      </ProveedorDeLaRanuraDeLaCabecera>,
    )
    const ranura = document.querySelector('[data-ranura-de-la-cabecera]')
    expect(ranura?.querySelector('[data-cabecera]')).not.toBeNull()
    expect(document.querySelector('[data-hoja] [data-cabecera]')).toBeNull()
    expect(ranura?.className).toContain('peer')
    expect(ranura?.nextElementSibling?.querySelector('[data-reserva]')).not.toBeNull()
    expect(ranura?.nextElementSibling?.className).toContain('peer-empty:block')
    expect(screen.getByRole('radio', { name: 'Unificado' })).toBeTruthy()
  })

  it('la cabecera quieta se dibuja con las mismas piezas, sin la marca de la de verdad, y nada sin qué dibujar', () => {
    const { container, rerender } = render(
      <CabeceraQuieta cabecera={hojaDePrueba({ modos: MODOS }).cabecera} />,
    )
    expect(container.querySelector('[data-cabecera]')).toBeNull()
    expect(screen.getByRole('radio', { name: 'Paralelo' })).toHaveProperty('checked', true)
    rerender(<CabeceraQuieta cabecera={hojaDePrueba({ modos: MODOS.slice(0, 1) }).cabecera} />)
    expect(container.firstChild).toBeNull()
  })
})
