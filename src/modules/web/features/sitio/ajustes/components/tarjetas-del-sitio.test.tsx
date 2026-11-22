import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { withNuqsTestingAdapter } from 'nuqs/adapters/testing'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AjustesDelSitio } from '../../../../entities/sitio/ajustes'
import { ModalDeIdentidad } from './modal-de-identidad'
import { ModalDeVitrina } from './modal-de-vitrina'
import { TarjetasDelSitio } from './tarjetas-del-sitio'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock('../actions/guardar-ajustes', () => ({ guardarAjustesDelSitio: vi.fn() }))

const ajustes: AjustesDelSitio = {
  nombreSitio: 'Autos del Sur',
  lema: null,
  whatsappRespaldo: null,
  horario: null,
  direccionPublica: 'https://autos-del-sur.example',
  redes: { instagram: 'https://instagram.com/autos' },
  seo: {},
  mostrarMonedaSecundaria: true,
  origenesVisibles: ['11111111-1111-4111-8111-111111111111'],
  actualizadoEn: '2026-11-20T10:00:00.000001+00:00',
}
const origenes = [
  { id: '11111111-1111-4111-8111-111111111111', nombre: 'Corea' },
  { id: '22222222-2222-4222-8222-222222222222', nombre: 'Japón' },
]

afterEach(cleanup)

describe('TarjetasDelSitio', () => {
  it('son cinco tarjetas con su «⋯» y lo guardado a la vista', () => {
    const Con = withNuqsTestingAdapter()
    render(
      <Con>
        <TarjetasDelSitio ajustes={ajustes} origenes={origenes} conteos={{}} />
      </Con>,
    )
    for (const titulo of ['Identidad del sitio', 'Contacto', 'Redes', 'SEO', 'Vitrina']) {
      expect(screen.getByRole('region', { name: titulo })).toBeTruthy()
    }
    expect(screen.getAllByRole('button', { name: /^Editar / })).toHaveLength(5)
    expect(screen.getAllByRole('button', { name: /^Más acciones de / })).toHaveLength(5)
    expect(screen.getByRole('region', { name: 'Identidad del sitio' }).textContent).toContain(
      'Autos del Sur',
    )
    expect(screen.getByRole('region', { name: 'Redes' }).textContent).toContain(
      'instagram.com/autos',
    )
    const vitrina = screen.getByRole('region', { name: 'Vitrina' }).textContent
    expect(vitrina).toContain('Corea')
    expect(vitrina).not.toContain('Japón')
  })
})

describe('Modales de «Ajustes»', () => {
  const alCerrar = vi.fn()

  it('Identidad parte de lo guardado y escribir lo quita de «sin cambios»', () => {
    render(<ModalDeIdentidad abierto alCerrar={alCerrar} ajustes={ajustes} />)
    const nombre = screen.getByLabelText('Nombre del sitio') as HTMLInputElement
    expect(nombre.value).toBe('Autos del Sur')
    fireEvent.change(nombre, { target: { value: 'Autos del Norte' } })
    expect(nombre.value).toBe('Autos del Norte')
  })

  it('Vitrina avisa cuántos vehículos dejan de verse al destildar un origen que hoy se ve', () => {
    render(
      <ModalDeVitrina
        abierto
        alCerrar={alCerrar}
        ajustes={ajustes}
        origenes={origenes}
        conteos={{ [origenes[0]!.id]: { n: 3, hayMas: false } }}
      />,
    )
    const corea = screen.getByRole('checkbox', { name: 'Corea' })
    expect(corea.getAttribute('aria-checked')).toBe('true')
    fireEvent.click(corea)
    expect(
      screen.getByText(/dejan de verse en la web 3 vehículos publicados de Corea/),
    ).toBeTruthy()
  })
})
