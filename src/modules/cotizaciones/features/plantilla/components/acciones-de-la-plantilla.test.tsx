import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PanelDeLaTarjeta } from '../hooks/use-panel-de-la-tarjeta'
import { AccionesDeLaPlantilla } from './acciones-de-la-plantilla'

const avisarError = vi.fn()
vi.mock('@/shared/ui/toasts', () => ({ avisarError: (e: unknown) => avisarError(e) }))
vi.mock('./diferidos', () => ({
  DescartarLaPlantillaDiferido: (p: { abierto: boolean; nombrado: string }) => (
    <div
      data-testid="dialogo-descartar"
      data-abierto={String(p.abierto)}
      data-nombrado={p.nombrado}
    />
  ),
  ModalDeLaInformacionDeLaTarjetaDiferido: (p: { abierto: boolean }) => (
    <div data-testid="modal-informacion" data-abierto={String(p.abierto)} />
  ),
  ModalDePublicarLaTarjetaDiferido: (p: { abierto: boolean; esperada: string | null }) => (
    <div
      data-testid="modal-publicar"
      data-abierto={String(p.abierto)}
      data-esperada={p.esperada ?? ''}
    />
  ),
}))

const HORA = '2026-11-07T15:00:00.123456+00:00'
const ORIGEN = { id: 'o', nombre: 'Mini' }
const INFORMACION = { de: 'borrador' as const, publicada: null }
const FDO = '44444444-4444-4444-8444-444444444444'

beforeEach(() => {
  avisarError.mockReset()
})
afterEach(cleanup)

const panel = (cambios: Partial<PanelDeLaTarjeta>, cerrar = vi.fn()): PanelDeLaTarjeta => ({
  publicando: false,
  descartando: false,
  informando: false,
  celda: false,
  columnas: false,
  abrirInformacion: vi.fn(),
  abrirCelda: vi.fn(),
  abrirColumnas: vi.fn(),
  abrirPublicar: vi.fn(),
  abrirDescartar: vi.fn(),
  cerrar,
  ...cambios,
})

describe('AccionesDeLaPlantilla', () => {
  it('no monta nada mientras ningún panel se abrió', () => {
    render(
      <AccionesDeLaPlantilla
        informacion={INFORMACION}
        panel={panel({})}
        origen={ORIGEN}
        formulaDelOrigenId={FDO}
        esperada={HORA}
      />,
    )
    expect(screen.queryByTestId('modal-publicar')).toBeNull()
  })

  it('?panel=publicar-tarjeta sin borrador no monta el modal, avisa y limpia la URL', () => {
    const cerrar = vi.fn()
    render(
      <AccionesDeLaPlantilla
        informacion={INFORMACION}
        panel={panel({ publicando: true }, cerrar)}
        origen={ORIGEN}
        formulaDelOrigenId={FDO}
        esperada={null}
      />,
    )
    expect(screen.queryByTestId('modal-publicar')).toBeNull()
    expect(avisarError).toHaveBeenCalledWith({
      codigo: 'no_encontrado',
      mensaje: 'No hay borrador para publicar.',
    })
    expect(cerrar).toHaveBeenCalledTimes(1)
  })

  it('con borrador monta el modal abierto con la esperada', () => {
    render(
      <AccionesDeLaPlantilla
        informacion={INFORMACION}
        panel={panel({ publicando: true })}
        origen={ORIGEN}
        formulaDelOrigenId={FDO}
        esperada={HORA}
      />,
    )
    const modal = screen.getByTestId('modal-publicar')
    expect(modal.getAttribute('data-abierto')).toBe('true')
    expect(modal.getAttribute('data-esperada')).toBe(HORA)
    expect(avisarError).not.toHaveBeenCalled()
  })
})

describe('AccionesDeLaPlantilla: descartar', () => {
  it('?panel=descartar-plantilla sin borrador no monta el diálogo, avisa y limpia la URL', () => {
    const cerrar = vi.fn()
    render(
      <AccionesDeLaPlantilla
        informacion={INFORMACION}
        panel={panel({ descartando: true }, cerrar)}
        origen={ORIGEN}
        formulaDelOrigenId={FDO}
        esperada={null}
      />,
    )
    expect(screen.queryByTestId('dialogo-descartar')).toBeNull()
    expect(avisarError).toHaveBeenCalledWith({
      codigo: 'no_encontrado',
      mensaje: 'No hay borrador para descartar.',
    })
    expect(cerrar).toHaveBeenCalledTimes(1)
  })

  it('con borrador monta el diálogo abierto con el borrador que nombra', () => {
    render(
      <AccionesDeLaPlantilla
        informacion={INFORMACION}
        panel={panel({ descartando: true })}
        origen={ORIGEN}
        formulaDelOrigenId={FDO}
        esperada={HORA}
      />,
    )
    const dialogo = screen.getByTestId('dialogo-descartar')
    expect(dialogo.getAttribute('data-abierto')).toBe('true')
    expect(dialogo.getAttribute('data-nombrado')).toBe(HORA)
  })
})

describe('AccionesDeLaPlantilla: información', () => {
  it('?panel=info-tarjeta monta «Información de la tarjeta» al abrirse y no antes', () => {
    const { rerender } = render(
      <AccionesDeLaPlantilla
        informacion={INFORMACION}
        panel={panel({})}
        origen={ORIGEN}
        formulaDelOrigenId={FDO}
        esperada={HORA}
      />,
    )
    expect(screen.queryByTestId('modal-informacion')).toBeNull()
    rerender(
      <AccionesDeLaPlantilla
        informacion={INFORMACION}
        panel={panel({ informando: true })}
        origen={ORIGEN}
        formulaDelOrigenId={FDO}
        esperada={HORA}
      />,
    )
    expect(screen.getByTestId('modal-informacion').getAttribute('data-abierto')).toBe('true')
  })
})
