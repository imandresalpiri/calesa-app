import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  MuestraDeColor,
  TarjetaDeAjustes,
  TarjetaEditable,
  TarjetasDeAjustes,
  ValoresDeLaTarjeta,
} from '.'

afterEach(cleanup)

describe('TarjetaDeAjustes', () => {
  it('es una región con el nombre de su título, con su «⋯» en la cabecera', () => {
    render(
      <TarjetasDeAjustes etiqueta="Ajustes de la empresa">
        <TarjetaDeAjustes
          titulo="Identidad"
          estado={<span>Activa</span>}
          acciones={<button type="button">Más acciones de Identidad</button>}
        >
          <p>Cuerpo</p>
        </TarjetaDeAjustes>
      </TarjetasDeAjustes>,
    )
    const region = screen.getByRole('region', { name: 'Identidad' })
    expect(within(region).getByRole('heading', { name: 'Identidad', level: 2 })).toBeTruthy()
    const cabecera = region.querySelector('header')
    expect(cabecera).not.toBeNull()
    expect(
      within(cabecera as HTMLElement).getByRole('button', { name: 'Más acciones de Identidad' }),
    ).toBeTruthy()
    expect(within(cabecera as HTMLElement).getByText('Activa')).toBeTruthy()
    expect(screen.getByRole('group', { name: 'Ajustes de la empresa' })).toBeTruthy()
  })
})

describe('ValoresDeLaTarjeta', () => {
  it('un valor vacío dice «Sin dato» y la nota va bajo el valor', () => {
    render(
      <ValoresDeLaTarjeta
        filas={[
          { etiqueta: 'NIT', valor: null },
          { etiqueta: 'País', valor: 'Bolivia', nota: 'Se usa en los PDF.' },
        ]}
      />,
    )
    expect(screen.getByText('NIT').nextElementSibling?.textContent).toBe('Sin dato')
    expect(screen.getByText('Bolivia')).toBeTruthy()
    expect(screen.getByText('Se usa en los PDF.')).toBeTruthy()
  })
})

describe('MuestraDeColor', () => {
  it('dice el color en texto, no sólo lo pinta', () => {
    render(<MuestraDeColor color="#0b5fff" />)
    expect(screen.getByText('#0b5fff')).toBeTruthy()
  })
})

describe('TarjetaEditable', () => {
  it('no dibuja ningún botón de acción suelto: sólo el botón de la tarjeta y su «⋯»', () => {
    render(
      <TarjetaEditable titulo="Identidad" motivo={null} abrir={() => undefined}>
        <p>Cuerpo</p>
      </TarjetaEditable>,
    )
    const region = screen.getByRole('region', { name: 'Identidad' })
    const nombres = within(region)
      .getAllByRole('button')
      .map((boton) => boton.getAttribute('aria-label'))
    expect(nombres).toEqual(['Editar Identidad', 'Más acciones de Identidad'])
  })

  it('tocar la tarjeta abre la acción principal', () => {
    const abrir = vi.fn()
    render(
      <TarjetaEditable titulo="Identidad" motivo={null} abrir={abrir}>
        <p>Cuerpo</p>
      </TarjetaEditable>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Editar Identidad' }))
    expect(abrir).toHaveBeenCalledTimes(1)
  })

  it('el orden del DOM, el del teclado, es la tarjeta y después su «⋯», hermanos', () => {
    render(
      <TarjetaEditable titulo="Identidad" motivo={null} abrir={() => undefined}>
        <p>Cuerpo</p>
      </TarjetaEditable>,
    )
    const [tarjeta, mas] = screen.getAllByRole('button')
    expect(tarjeta?.getAttribute('aria-label')).toBe('Editar Identidad')
    expect(mas?.getAttribute('aria-label')).toBe('Más acciones de Identidad')
    expect(tarjeta?.contains(mas ?? null)).toBe(false)
    expect(tarjeta?.compareDocumentPosition(mas as Node)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
  })

  it('sin permiso la tarjeta no abre nada y el «⋯» sigue', () => {
    render(
      <TarjetaEditable titulo="Identidad" motivo="No tienes permiso." abrir={() => undefined}>
        <p>Cuerpo</p>
      </TarjetaEditable>,
    )
    expect(screen.queryByRole('button', { name: 'Editar Identidad' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Más acciones de Identidad' })).toBeTruthy()
  })
})
