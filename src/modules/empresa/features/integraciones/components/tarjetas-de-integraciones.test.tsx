import { cleanup, render, screen, within } from '@testing-library/react'
import { withNuqsTestingAdapter } from 'nuqs/adapters/testing'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Integracion } from '../../../entities/integraciones'
import { MOTIVO_SIN_PERMISO_AJUSTES, MOTIVO_SIN_SECRETO } from '../../../entities/motivos'
import { TarjetasDeIntegraciones } from './tarjetas-de-integraciones'

// Las actions y la consulta de uso tocan el servidor: acá no se guarda nada.
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock('../actions/guardar-apibara', () => ({ guardarApibara: vi.fn() }))
vi.mock('../actions/guardar-web-publica', () => ({ guardarWebPublica: vi.fn() }))
vi.mock('../actions/guardar-push-web', () => ({ guardarPushWeb: vi.fn() }))
vi.mock('../actions/guardar-secreto', () => ({ guardarSecreto: vi.fn() }))
vi.mock('../actions/probar-web-publica', () => ({ probarWebPublica: vi.fn() }))
vi.mock('../../../composicion.client', () => ({ consultarUso: vi.fn() }))

const VERSION = '2026-10-12T14:00:00+00:00'
const fila = (clave: Integracion['clave'], resto: Partial<Integracion> = {}): Integracion => ({
  clave,
  activa: false,
  config:
    clave === 'apibara'
      ? { endpoint: 'https://api.apibara.tech', plataformas: ['copart'] }
      : { revalidar_url: null },
  secretoGuardadoEn: null,
  actualizadoEn: VERSION,
  ...resto,
})

afterEach(cleanup)

function tarjetas(puedeEditar: boolean, apibara = fila('apibara')) {
  const Con = withNuqsTestingAdapter()
  render(
    <Con>
      <TarjetasDeIntegraciones
        apibara={apibara}
        webPublica={fila('web_publica')}
        pushWeb={fila('push_web')}
        sinClavePublica={false}
        vehiculosQueCambian={null}
        puedeEditar={puedeEditar}
      />
    </Con>,
  )
}

describe('TarjetasDeIntegraciones', () => {
  it('una tarjeta por integración, cada una con su estado', () => {
    tarjetas(true)
    expect(
      within(screen.getByRole('region', { name: 'apibara' })).getByText('Falta la clave', {
        selector: '[data-slot=badge]',
      }),
    ).toBeTruthy()
    expect(
      within(screen.getByRole('region', { name: 'Web pública' })).getByText('Apagada', {
        selector: '[data-slot=badge]',
      }),
    ).toBeTruthy()
    expect(
      within(screen.getByRole('region', { name: 'Avisos push' })).getByText('Apagada', {
        selector: '[data-slot=badge]',
      }),
    ).toBeTruthy()
  })

  it('apibara sin clave no se activa y dice por qué', () => {
    tarjetas(true)
    const tarjeta = screen.getByRole('region', { name: 'apibara' })
    expect(
      within(tarjeta).getByRole('switch', { name: 'Activa' }).getAttribute('data-disabled'),
    ).toBe('')
    expect(within(tarjeta).getByText(MOTIVO_SIN_SECRETO)).toBeTruthy()
    expect(within(tarjeta).getByText('Falta la clave', { selector: 'dd' })).toBeTruthy()
  })

  it('con la clave guardada dice cuándo, sin mostrarla', () => {
    tarjetas(
      true,
      fila('apibara', { secretoGuardadoEn: '2026-10-10T12:00:00+00:00', activa: true }),
    )
    const tarjeta = screen.getByRole('region', { name: 'apibara' })
    expect(within(tarjeta).getByText('Activa', { selector: '[data-slot=badge]' })).toBeTruthy()
    expect(within(tarjeta).getByText(/Guardada el/)).toBeTruthy()
    expect(within(tarjeta).getByText('No se puede ver: sólo reemplazar.')).toBeTruthy()
  })

  it('sin permiso se ve todo, sin «Configurar» y con los interruptores apagados y el motivo', () => {
    tarjetas(false)
    expect(screen.getAllByText(MOTIVO_SIN_PERMISO_AJUSTES).length).toBeGreaterThan(0)
    for (const titulo of ['apibara', 'Web pública']) {
      const tarjeta = screen.getByRole('region', { name: titulo })
      expect(within(tarjeta).queryByRole('button', { name: /^Configurar/ })).toBeNull()
      expect(
        within(tarjeta).getByRole('button', { name: `Más acciones de ${titulo}` }),
      ).toBeTruthy()
    }
    for (const interruptor of screen.getAllByRole('switch')) {
      expect(interruptor.getAttribute('data-disabled')).toBe('')
    }
  })
})
