import { cleanup, render, screen } from '@testing-library/react'
import { NuqsTestingAdapter } from 'nuqs/adapters/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CLASE_LIVE } from '@/shared/ui/guion-live'
import { DATOS_DE_PRUEBA } from '../../../../entities/tarjeta/compartir/compartir.soporte'

const pedirLosDatos = vi.hoisted(() => vi.fn())
const pedirLaImagenParaCompartir = vi.hoisted(() => vi.fn())
vi.mock('../../../../areas/tarjeta/composicion-compartir.client', () => ({
  pedirLosDatos,
  pedirLaImagenParaCompartir,
  pedirLasFotos: vi.fn(() => Promise.resolve({ ok: true, data: [] })),
  pedirLaFoto: vi.fn(),
  MENSAJE_SIN_ACCESO: 'No tienes acceso a esta cotización.',
}))

import { PanelDeCompartir } from './panel-de-compartir'

const ID = '0b7a2f0e-1c2d-4e5f-8a9b-0c1d2e3f4a5b'

function abrir(cotizacionId = ID, pestana = '') {
  render(
    <NuqsTestingAdapter searchParams={`?panel=compartir${pestana}`}>
      <PanelDeCompartir abierto alCerrar={() => undefined} cotizacionId={cotizacionId} />
    </NuqsTestingAdapter>,
  )
}

beforeEach(() => {
  pedirLosDatos.mockResolvedValue({ ok: true, data: DATOS_DE_PRUEBA })
  // La imagen de la tarjeta no llega en jsdom (no hay lienzo): queda «Preparando la imagen…».
  pedirLaImagenParaCompartir.mockReturnValue(new Promise(() => undefined))
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  document.documentElement.classList.remove(CLASE_LIVE)
})

describe('<PanelDeCompartir>', () => {
  it('con todo leído: «Imagen» con la de la tarjeta que se prepara, «Fotos» si el vehículo las tiene, el autor y los motivos a la vista', async () => {
    abrir()
    expect(await screen.findByText('Creado por Ana Pérez')).toBeTruthy()
    expect(screen.getByText('Preparando la imagen…')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Fotos' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Copiar imagen' }).hasAttribute('disabled')).toBe(
      true,
    )
    expect(screen.getByText(/La imagen todavía no está lista\./)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Descargar PDF' }).hasAttribute('disabled')).toBe(
      false,
    )
  })

  it('sin vehículo no ofrece «Fotos»', async () => {
    pedirLosDatos.mockResolvedValue({ ok: true, data: { ...DATOS_DE_PRUEBA, vehiculo: null } })
    abrir()
    await screen.findByRole('tab', { name: 'Texto' })
    await screen.findByRole('button', { name: 'Copiar texto' })
    expect(screen.queryByRole('button', { name: 'Fotos' })).toBeNull()
  })

  it('lo que no se ve: «No tienes acceso a esta cotización.» con «Cerrar»', async () => {
    pedirLosDatos.mockResolvedValue({
      ok: false,
      error: { codigo: 'no_encontrado', mensaje: 'No tienes acceso a esta cotización.' },
    })
    abrir()
    expect(await screen.findByText('No tienes acceso a esta cotización.')).toBeTruthy()
    // «Cerrar» en el pie, además de la ✕ del modal.
    expect(screen.getAllByRole('button', { name: 'Cerrar' })).toHaveLength(2)
    expect(screen.queryByRole('button', { name: 'Copiar texto' })).toBeNull()
  })

  it('un id que no es de una cotización no pide nada', async () => {
    abrir('../x')
    expect(await screen.findByText('No tienes acceso a esta cotización.')).toBeTruthy()
    expect(pedirLosDatos).not.toHaveBeenCalled()
  })
})

describe('<PanelDeCompartir> con el Modo Live', () => {
  beforeEach(() => {
    document.documentElement.classList.add(CLASE_LIVE)
    // jsdom no tiene `URL.createObjectURL`: la vista sin moneda sale con una URL fija.
    URL.createObjectURL = vi.fn(() => 'blob:sin-moneda')
    URL.revokeObjectURL = vi.fn()
    pedirLaImagenParaCompartir.mockImplementation(
      (_id: string, _senal: AbortSignal, opciones?: { sinMoneda?: boolean }) =>
        opciones?.sinMoneda === true
          ? Promise.resolve({ ok: true, data: new Blob(['webp'], { type: 'image/webp' }) })
          : new Promise(() => undefined),
    )
  })

  it('se comparte: muestra la imagen sin moneda y pide también la completa, la que se copia', async () => {
    abrir()
    expect(await screen.findByText('Creado por Ana Pérez')).toBeTruthy()
    expect(screen.queryByText('Con el Modo Live no se comparte.')).toBeNull()
    const vista = await screen.findByAltText('Imagen de la tarjeta de la cotización n.º 12')
    expect(vista.getAttribute('src')).toBe('blob:sin-moneda')
    expect(vista.getAttribute('data-imagen-moneda')).toBe('sin')
    expect(pedirLaImagenParaCompartir).toHaveBeenCalledWith(ID, expect.anything(), {
      sinMoneda: true,
    })
    expect(pedirLaImagenParaCompartir).toHaveBeenCalledWith(ID, expect.anything())
  })

  it('el texto a la vista va sin moneda, con los mismos números', async () => {
    abrir(ID, '&compartir=texto')
    await screen.findByText('Creado por Ana Pérez')
    const texto = (screen.getByRole('textbox') as HTMLTextAreaElement).value
    expect(texto).toContain('TOTAL: 1.300,00')
    expect(texto).not.toMatch(/\$|Bs /)
  })
})
