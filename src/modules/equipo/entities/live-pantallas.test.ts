import { describe, expect, it } from 'vitest'
import { AJUSTES_POR_DEFECTO_DEL_LIVE, CLIENTE_EN_EL_LIVE, type AjustesDelLive } from './live'
import type { EstadoDelLive } from './live-combinar'
import type { Permisos } from '@/shared/lib/permisos'
import {
  AREAS_DEL_LIVE,
  barraDelClienteEnElLive,
  clienteDeLaCotizacion,
  clienteEnElLive,
  origenVisibleEnElLive,
  seOcultaEnElLive,
  type AreaDelLive,
} from './live-pantallas'

const O1 = '00000000-0000-4000-8000-0000000000a1'
const O2 = '00000000-0000-4000-8000-0000000000a2'

const APAGADO: EstadoDelLive = { encendido: false, puedeEncender: true }

function encendido(
  ajustes: Partial<AjustesDelLive> = {},
  nombresDeClientes = false,
): EstadoDelLive {
  return {
    encendido: true,
    puedeEncender: true,
    ajustes: { ...AJUSTES_POR_DEFECTO_DEL_LIVE, ...ajustes },
    nombresDeClientes,
  }
}

function ocultas(live: EstadoDelLive): AreaDelLive[] {
  return AREAS_DEL_LIVE.filter((area) => seOcultaEnElLive(live, area))
}

describe('seOcultaEnElLive', () => {
  it('con el Live apagado no oculta nada', () => {
    expect(ocultas(APAGADO)).toEqual([])
  })

  it('por defecto deja sólo vehículos y cotizaciones', () => {
    expect(AREAS_DEL_LIVE.filter((area) => !seOcultaEnElLive(encendido(), area))).toEqual([
      'vehiculos',
      'cotizaciones',
    ])
  })

  it('cada área contra su ajuste', () => {
    const tabla: [Partial<AjustesDelLive>, AreaDelLive, boolean][] = [
      [{ vehiculos: false }, 'vehiculos', true],
      [{ cotizaciones: false }, 'cotizaciones', true],
      [{ clientes: 'nombres' }, 'clientes', true],
      [{ clientes: 'completo' }, 'clientes', false],
      [{ logistica: 'cadena' }, 'logistica.cadena', false],
      [{ logistica: 'cadena' }, 'logistica', true],
      [{ repuestos: 'estadisticas' }, 'repuestos.estadisticas', false],
      [{ repuestos: 'estadisticas' }, 'repuestos', true],
      [{ inicio: true }, 'inicio', false],
      [{ inicio: true }, 'tablero', false],
      [{ origenesConfig: 'lectura' }, 'origenes.lectura', false],
      [{ origenesConfig: 'apagado' }, 'origenes.lectura', true],
    ]
    for (const [ajustes, area, oculta] of tabla) {
      expect(
        seOcultaEnElLive(encendido(ajustes), area),
        `${JSON.stringify(ajustes)} → ${area}`,
      ).toBe(oculta)
    }
  })

  it('lo siempre oculto no lo abre ningún ajuste', () => {
    const todo = encendido({
      clientes: 'completo',
      logistica: 'cadena',
      repuestos: 'estadisticas',
      inicio: true,
      origenesConfig: 'lectura',
    })
    expect(ocultas(todo)).toEqual(['logistica', 'repuestos', 'siempre-oculto'])
  })
})

describe('origenVisibleEnElLive', () => {
  it('apagado o con «todos»: cualquier origen', () => {
    expect(origenVisibleEnElLive(APAGADO, O1)).toBe(true)
    expect(origenVisibleEnElLive(encendido(), O2)).toBe(true)
  })

  it('con algunos: sólo los elegidos, y nunca lo que no tiene origen', () => {
    const live = encendido({ origenes: [O1] })
    expect(origenVisibleEnElLive(live, O1)).toBe(true)
    expect(origenVisibleEnElLive(live, O2)).toBe(false)
    expect(origenVisibleEnElLive(live, null)).toBe(false)
  })
})

describe('clienteEnElLive', () => {
  it('se ve el nombre con el Live apagado, con «Completo» o con nombres que se pueden leer', () => {
    expect(clienteEnElLive(APAGADO)).toBe('nombre')
    expect(clienteEnElLive(encendido({ clientes: 'completo' }))).toBe('nombre')
    expect(clienteEnElLive(encendido({ clientes: 'nombres' }, true))).toBe('nombre')
  })

  it('si no, se ve «Cliente»', () => {
    expect(CLIENTE_EN_EL_LIVE).toBe('Cliente')
    expect(clienteEnElLive(encendido())).toBe('oculto')
    expect(clienteEnElLive(encendido({ clientes: 'nombres' }, false))).toBe('oculto')
  })
})

describe('clienteDeLaCotizacion', () => {
  const CON_LEADS: Permisos = [{ clave: 'leads.ver', origenId: null, alcance: 'todos' }]
  const SIN_PERMISOS: Permisos = []

  it('fuera del Live o con «Completo», el nombre sólo con `leads.ver`', () => {
    expect(clienteDeLaCotizacion(APAGADO, CON_LEADS)).toBe('leer')
    expect(clienteDeLaCotizacion(APAGADO, SIN_PERMISOS)).toBe('ninguno')
    expect(clienteDeLaCotizacion(encendido({ clientes: 'completo' }), CON_LEADS)).toBe('leer')
    expect(clienteDeLaCotizacion(encendido({ clientes: 'completo' }), SIN_PERMISOS)).toBe('ninguno')
  })

  it('con «Sólo nombres» lee si los permisos reales tienen `leads.ver`, aunque los del Live no', () => {
    expect(clienteDeLaCotizacion(encendido({ clientes: 'nombres' }, true), SIN_PERMISOS)).toBe(
      'leer',
    )
  })

  it('con «Apagado», o «Sólo nombres» sin `leads.ver` real, «Cliente» sin leer', () => {
    expect(clienteDeLaCotizacion(encendido(), CON_LEADS)).toBe('reemplazar')
    expect(clienteDeLaCotizacion(encendido({ clientes: 'nombres' }, false), CON_LEADS)).toBe(
      'reemplazar',
    )
  })
})

describe('barraDelClienteEnElLive', () => {
  it('fuera del Live y con «Completo», como siempre', () => {
    expect(barraDelClienteEnElLive(APAGADO)).toBeNull()
    expect(barraDelClienteEnElLive(encendido({ clientes: 'completo' }))).toBeNull()
  })

  it('con «Sólo nombres» y nombres que se pueden leer, el panel sólo con nombres', () => {
    expect(barraDelClienteEnElLive(encendido({ clientes: 'nombres' }, true))).toBe('nombres')
  })

  it('si no, apagada', () => {
    expect(barraDelClienteEnElLive(encendido())).toBe('apagado')
    expect(barraDelClienteEnElLive(encendido({ clientes: 'nombres' }, false))).toBe('apagado')
  })
})
