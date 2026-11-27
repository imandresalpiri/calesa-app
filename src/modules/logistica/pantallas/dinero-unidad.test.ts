import { describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import { huecosVisibles } from '../entities/nucleo/hueco'
import { tarjetasDeLaUnidad } from '../entities/nucleo/tarjetas'
import { vistaActiva } from '../entities/nucleo/vistas-de-la-tarjeta'
import { HUECOS_DE_DINERO_EN_LA_UNIDAD } from './dinero-unidad'

const ORIGEN = 'o1'
const concede = (clave: string, origenId: string | null = ORIGEN): Permisos[number] => ({
  clave: clave as Permisos[number]['clave'],
  origenId,
  alcance: 'todos',
})
const TODOS: Permisos = [
  concede('logistica.gastos.ver'),
  concede('logistica.pagos.ver'),
  concede('logistica.margen.ver'),
]

// Las vistas del drawer de la tarjeta «Dinero»: los huecos de dinero que quien mira ve, con su permiso en el origen y su regla del flujo.
function vistasDeDinero(permisos: Permisos, reglasActivas: readonly string[]) {
  const huecos = huecosVisibles(HUECOS_DE_DINERO_EN_LA_UNIDAD, {
    permisos,
    origenId: ORIGEN,
    reglasActivas,
  })
  const dinero = tarjetasDeLaUnidad(huecos).find((t) => t.clave === 'dinero')
  return dinero?.huecos.map((h) => h.clave) ?? []
}

describe('las vistas de Dinero', () => {
  it('con todo, Gastos, Pagos y Margen en ese orden', () => {
    expect(vistasDeDinero(TODOS, ['gastos', 'pagos'])).toEqual(['gastos', 'pagos', 'margen'])
  })

  it('cada una pide su permiso en el origen de la unidad', () => {
    expect(vistasDeDinero(TODOS.slice(1), ['gastos', 'pagos'])).toEqual(['pagos', 'margen'])
    expect(vistasDeDinero([concede('logistica.gastos.ver')], ['gastos', 'pagos'])).toEqual([
      'gastos',
    ])
    expect(vistasDeDinero([concede('logistica.pagos.ver', 'otro')], ['gastos', 'pagos'])).toEqual(
      [],
    )
  })

  it('Gastos y Pagos piden su regla; el Margen no depende de ninguna', () => {
    expect(vistasDeDinero(TODOS, ['pagos'])).toEqual(['pagos', 'margen'])
    expect(vistasDeDinero(TODOS, [])).toEqual(['margen'])
  })

  it('un panel de gasto, de pago o del desglose abre su vista', () => {
    const vistas = HUECOS_DE_DINERO_EN_LA_UNIDAD.map((h) => ({
      clave: h.clave,
      titulo: h.titulo,
      paneles: h.paneles ?? [],
    }))
    expect(vistaActiva(vistas, { pedida: null, panel: 'gasto' })).toBe('gastos')
    expect(vistaActiva(vistas, { pedida: 'gastos', panel: 'anular-pago' })).toBe('pagos')
    expect(vistaActiva(vistas, { pedida: null, panel: 'desglose-del-margen' })).toBe('margen')
  })
})
