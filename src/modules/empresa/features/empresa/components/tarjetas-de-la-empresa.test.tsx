import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { withNuqsTestingAdapter } from 'nuqs/adapters/testing'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AjustesEmpresa } from '../../../entities/ajustes-empresa'
import type { ListaDeLogos } from '../../../entities/logos'
import { MOTIVO_SIN_PERMISO_AJUSTES } from '../../../entities/motivos'
import { ModalDeIdentidad } from './modal-de-identidad'
import { TarjetasDeLaEmpresa } from './tarjetas-de-la-empresa'

// El campo del logo prepara archivos con el cliente de Storage; los íconos, la acción del servidor: acá no se sube ni se guarda nada.
vi.mock('../../../composicion.client', () => ({
  prepararLogo: vi.fn(),
  subirLogo: vi.fn(),
  descartarLogo: vi.fn(),
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock('../actions/guardar-ajustes', () => ({ guardarAjustes: vi.fn() }))
vi.mock('../../iconos/actions/guardar-iconos', () => ({ guardarIconos: vi.fn() }))

const ajustes: AjustesEmpresa = {
  nombre: 'Importadora Andina',
  razonSocial: null,
  nit: null,
  direccion: null,
  ciudad: null,
  pais: 'Bolivia',
  telefono: null,
  telefonoCc: null,
  whatsapp: null,
  email: null,
  logoRuta: null,
  logoOscuroRuta: null,
  colorAcento: null,
  iconos: null,
  locale: 'es-BO',
  zonaHoraria: 'America/La_Paz',
  monedaBase: 'USD',
  registroAbierto: false,
  papeleraDias: 30,
  actividadDias: 14,
  limpiezaAutomatica: true,
  limpiezaDiasGracia: 7,
  actualizadoEn: '2026-10-12T14:00:00+00:00',
} as AjustesEmpresa

// Sin logos subidos: las dos fijas sin archivo y ninguna propia.
const LOGOS: ListaDeLogos = {
  tope: 12,
  variantes: [
    {
      id: 'principal',
      nombre: 'Principal',
      ruta: null,
      tipo: null,
      ancho: null,
      alto: null,
      actualizadoEn: null,
      uso: 'principal',
    },
    {
      id: 'oscuro',
      nombre: 'Para fondo oscuro',
      ruta: null,
      tipo: null,
      ancho: null,
      alto: null,
      actualizadoEn: null,
      uso: 'oscuro',
    },
  ],
}

afterEach(cleanup)

describe('TarjetasDeLaEmpresa', () => {
  function tarjetas(puedeEditar: boolean) {
    const Con = withNuqsTestingAdapter()
    render(
      <Con>
        <TarjetasDeLaEmpresa
          ajustes={ajustes}
          logoUrl={null}
          logoOscuroUrl={null}
          iconoActualUrl="/iconos/neutro-192.png"
          zonas={['America/La_Paz']}
          puedeEditar={puedeEditar}
          enlacesDeAyuda={{ tope: 30, enlaces: [] }}
          logos={LOGOS}
        />
      </Con>,
    )
  }

  it('con permiso hay siete tarjetas con su «⋯» y sin aviso', () => {
    tarjetas(true)
    for (const titulo of ['Identidad', 'Región', 'Datos legales y de contacto', 'Políticas']) {
      expect(screen.getByRole('region', { name: titulo })).toBeTruthy()
    }
    expect(screen.getByRole('region', { name: 'Íconos de la app' })).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Enlaces de ayuda' })).toBeTruthy()
    // «Logos» abre con «Gestionar logos» aunque no haya variantes propias.
    expect(screen.getByRole('region', { name: 'Logos' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Gestionar logos' })).toBeTruthy()
    expect(screen.getByText('Todavía no hay enlaces de ayuda.')).toBeTruthy()
    // «Íconos de la app» no abre sin logo: su botón no se dibuja y su «⋯» lo dice.
    expect(screen.getAllByRole('button', { name: /^Editar / })).toHaveLength(5)
    expect(screen.getAllByRole('button', { name: /^Más acciones de / })).toHaveLength(7)
    expect(screen.queryByText(MOTIVO_SIN_PERMISO_AJUSTES)).toBeNull()
  })

  it('sin permiso se ve todo, sin botón para editar y con el motivo', () => {
    tarjetas(false)
    expect(screen.getByText(MOTIVO_SIN_PERMISO_AJUSTES)).toBeTruthy()
    expect(screen.queryAllByRole('button', { name: /^Editar / })).toHaveLength(0)
    expect(screen.queryByRole('button', { name: 'Gestionar logos' })).toBeNull()
    expect(screen.getAllByRole('button', { name: /^Más acciones de / })).toHaveLength(7)
  })
})

describe('Modales de los datos de la empresa', () => {
  const alCerrar = vi.fn()

  it('un color sin contraste dice su motivo al tipearlo, antes de guardar', () => {
    render(
      <ModalDeIdentidad
        abierto
        alCerrar={alCerrar}
        ajustes={ajustes}
        logoUrl={null}
        logoOscuroUrl={null}
      />,
    )
    const campo = screen.getByLabelText('Color de la marca')
    fireEvent.change(campo, { target: { value: '#ff0000' } })
    expect(campo.getAttribute('aria-invalid')).toBe('true')
    expect(screen.getByText(/el texto de los botones no se lee/)).toBeTruthy()
  })
})
