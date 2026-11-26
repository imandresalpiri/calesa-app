import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ContextoDeHoja } from '../../../entities/binding'
import { indiceDeHoja, entradasIniciales } from '../../../entities/entradas'
import { hojaDePrueba, respuestaDePrueba } from '../../../entities/hoja-de-prueba.soporte'
import { ContextoDelTotal, type DelTotal } from './contexto-del-total'
import { RegionDelTotal } from './region-del-total'

const hoja = hojaDePrueba()
const indice = indiceDeHoja(hoja.secciones, hoja.cabecera.modos, hoja.cabecera.modoPorDefecto)
const contexto: ContextoDeHoja = {
  indice,
  entradas: entradasIniciales(indice),
  respuesta: respuestaDePrueba({ usd: 1355 }),
}

const del = (cambios: Partial<DelTotal> = {}): DelTotal => ({
  estado: { tipo: 'al_dia' },
  alReintentar: vi.fn(),
  alRecargar: vi.fn(),
  monedaDelTotalBs: null,
  secundarios: [],
  totalGuardado: null,
  pisadas: null,
  avisoDelVehiculo: null,
  ...cambios,
})

afterEach(cleanup)

describe('RegionDelTotal', () => {
  it('sin ContextoDelTotal (el editor), sólo la tarjeta', () => {
    render(<RegionDelTotal etiqueta="Total" decimales={undefined} contexto={contexto} />)
    expect(document.querySelector('[data-tarjeta-del-total]')).not.toBeNull()
    expect(document.querySelector('[data-total-de-la-hoja]')).toBeNull()
  })

  it('mientras recalcula se marca ocupada y dice «Total desactualizado.» debajo de la tarjeta, fuera de ella', () => {
    render(
      <ContextoDelTotal value={del({ estado: { tipo: 'recalculando' } })}>
        <RegionDelTotal etiqueta="Total" decimales={undefined} contexto={contexto} />
      </ContextoDelTotal>,
    )
    const region = document.querySelector<HTMLElement>('[data-total-de-la-hoja]')
    if (region === null) throw new Error('sin región')
    expect(region.getAttribute('aria-busy')).toBe('true')
    expect(region.getAttribute('data-viejo')).toBe('true')
    const aviso = within(region).getByText('Total desactualizado.')
    expect(aviso.closest('[data-tarjeta-del-total]')).toBeNull()
    expect(aviso.closest('[role="status"]')).not.toBeNull()
  })

  it('el vehículo que no se pudo usar y el total guardado van debajo, fuera de la tarjeta', () => {
    render(
      <ContextoDelTotal
        value={del({
          avisoDelVehiculo: 'No se puede usar ese vehículo.',
          totalGuardado: <p>Total guardado</p>,
        })}
      >
        <RegionDelTotal etiqueta="Total" decimales={undefined} contexto={contexto} />
      </ContextoDelTotal>,
    )
    const tarjeta = document.querySelector('[data-tarjeta-del-total]')
    expect(tarjeta?.contains(screen.getByText('No se puede usar ese vehículo.'))).toBe(false)
    expect(tarjeta?.contains(screen.getByText('Total guardado'))).toBe(false)
  })

  it('el total y el de la moneda local con los «Decimales» del total; sin ellos, 2', () => {
    const conBs: ContextoDeHoja = {
      ...contexto,
      respuesta: {
        ...respuestaDePrueba({ usd: 1234.5678 }),
        totales: { usd: 1234.5678, bs: 8592.5649, sumaUsd: null },
      },
    }
    const plano = (sel: string) =>
      (document.querySelector(sel)?.querySelector('[data-monto-valor]')?.textContent ?? '').replace(
        /[\u00a0\u202f]/g,
        ' ',
      )
    const dibujar = (decimales: number | undefined) =>
      render(
        <ContextoDelTotal value={del({ monedaDelTotalBs: 'BOB' })}>
          <RegionDelTotal etiqueta="Total" decimales={decimales} contexto={conBs} />
        </ContextoDelTotal>,
      )
    dibujar(0)
    expect(plano('[data-total]')).toBe('USD 1.235')
    expect(plano('[data-total-bs]')).toBe('Bs 8.593')
    cleanup()
    dibujar(3)
    expect(plano('[data-total]')).toBe('USD 1.234,568')
    expect(plano('[data-total-bs]')).toBe('Bs 8.592,565')
    cleanup()
    dibujar(undefined)
    expect(plano('[data-total]')).toBe('USD 1.234,57')
    expect(plano('[data-total-bs]')).toBe('Bs 8.592,56')
  })
})
