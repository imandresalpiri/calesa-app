import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { NuqsTestingAdapter } from 'nuqs/adapters/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Resultado } from '@/shared/lib/errores'
import type { FormulaParaEditar } from '../../../../entities/formula/edicion'
import { formulaDePrueba } from '../../../../entities/formula/fila-de-prueba.soporte'
import { SesionDeLaFormula, type PropsDeLaSesion } from './sesion-de-la-formula'

vi.mock('../../actions/guardar-borrador', () => ({
  guardarBorrador: () => Promise.resolve(undefined),
}))
type Respuesta = Resultado<FormulaParaEditar | null>
const pedidos: ((r: Respuesta) => void)[] = []
vi.mock('../../../../areas/formula/composicion.client', () => ({
  leerElTerrenoDePrueba: () =>
    Promise.resolve({
      ok: true as const,
      data: { tipos_cambio: { oficial: 2 }, monedas: { oficial: 'BOB' }, tablas: {}, avisos: [] },
    }),
  leerDefinicionParaEditar: () =>
    new Promise<Respuesta>((resolver) => {
      pedidos.push(resolver)
    }),
  leerTonosDelCatalogo: () => Promise.resolve({ ok: true as const, data: [] }),
}))
vi.mock('@/shared/ui/toasts', () => ({ avisar: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
// Lo diferido llega directo.
vi.mock('../planilla/diferidos', async () => ({
  PlanillaDiferida: (await import('../planilla/planilla-de-la-formula')).PlanillaDeLaFormula,
}))

const ORIGEN = { id: '11111111-1111-4111-8111-111111111111', nombre: 'Japón' }
const formula = formulaDePrueba([
  { id: 'comision', texto: '=remate*4%', etiqueta: 'Comisión' },
  { id: 'despacho', texto: '=900', etiqueta: 'Despacho' },
  { id: 'total', texto: '=comision+despacho', etiqueta: 'Total' },
])
const leida: Respuesta = {
  ok: true,
  data: {
    id: '22222222-2222-4222-8222-222222222222',
    formulaDelOrigenId: '44444444-4444-4444-8444-444444444444',
    actualizadoEn: '2026-11-07T15:00:00.123456+00:00',
    estado: 'borrador',
    diseno: null,
    nota: null,
    formula,
  },
}

const props = (extra: Partial<PropsDeLaSesion> = {}): PropsDeLaSesion => ({
  origen: ORIGEN,
  formulaDelOrigenId: '44444444-4444-4444-8444-444444444444',
  formulaId: '22222222-2222-4222-8222-222222222222',
  sobre: 'Sobre el borrador de Ana.',
  estadoGuardado: null,
  recargando: false,
  alRecargar: vi.fn(),
  alCambiarPendientes: vi.fn(),
  tarjeta: { estado: 'sin_tarjeta' },
  tablas: [],
  TarjetaEnVivo: () => null,
  puedeCambiarTiposDeCambio: false,
  tiposDeCambio: [],
  ...extra,
})

const dibujar = (p: PropsDeLaSesion) =>
  render(
    <NuqsTestingAdapter>
      <SesionDeLaFormula {...p} />
    </NuqsTestingAdapter>,
  )

const responder = async () => {
  await waitFor(() => {
    expect(pedidos.length).toBeGreaterThan(0)
  })
  await act(async () => {
    pedidos[0]?.(leida)
    await Promise.resolve()
  })
}

beforeEach(() => {
  // jsdom no desplaza: la celda activa se lleva a la vista.
  Element.prototype.scrollIntoView = () => undefined
  pedidos.length = 0
  window.sessionStorage.clear()
})
afterEach(cleanup)

describe('SesionDeLaFormula', () => {
  it('mientras lee, el esqueleto en la planilla; leída, la cuadrícula con sus columnas y la guía de la barra', async () => {
    dibujar(props())
    expect(screen.getByRole('region', { name: 'Planilla de la fórmula' })).toBeTruthy()
    expect(screen.getByLabelText('Cargando la lista')).toBeTruthy()
    await responder()
    expect(screen.getByRole('grid', { name: 'Filas de la fórmula de Japón' })).toBeTruthy()
    for (const columna of ['A · concepto', 'B · %', 'C · valor', 'Ejemplo']) {
      expect(screen.getByRole('columnheader', { name: columna })).toBeTruthy()
    }
    expect(screen.getByPlaceholderText('Escribe = y toca las celdas: =C5+C7')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Modo avanzado/ })).toBeNull()
  })

  it('lo aplicado en una celda queda en la fórmula de trabajo, sin volver a leer, y avisa que hay cambios sin guardar', async () => {
    const alCambiarPendientes = vi.fn()
    dibujar(props({ alCambiarPendientes }))
    await responder()
    const celdaDeDespacho = () => document.querySelector('tr[data-fila="despacho"] [data-col="C"]')
    const celda = celdaDeDespacho()
    if (celda === null) throw new Error('Falta la C de «Despacho».')
    fireEvent.doubleClick(celda)
    const entrada = screen.getByRole('combobox', { name: /^C\d+, Despacho, valor$/ })
    fireEvent.change(entrada, { target: { value: '=950' } })
    fireEvent.keyDown(entrada, { key: 'Enter' })
    await waitFor(() => {
      expect(alCambiarPendientes).toHaveBeenLastCalledWith(true)
    })
    expect(celdaDeDespacho()?.textContent).toContain('950')
    expect(pedidos).toHaveLength(1)
  })
})
