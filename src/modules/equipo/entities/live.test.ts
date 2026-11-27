import { describe, expect, it } from 'vitest'
import {
  AJUSTES_POR_DEFECTO_DEL_LIVE,
  CAMPOS_DEL_LIVE,
  ajustesDesdeLaBase,
  ajustesParaLaBase,
  camposPisados,
  esquemaDeAjustesDelLive,
  esquemaDeAjustesParcialesDelLive,
} from './live'

const O1 = '00000000-0000-4000-8000-0000000000a1'
const O2 = '00000000-0000-4000-8000-0000000000a2'

describe('AJUSTES_POR_DEFECTO_DEL_LIVE', () => {
  it('deja encender y ver vehículos de todos los orígenes y cotizaciones; lo demás, oculto', () => {
    expect(AJUSTES_POR_DEFECTO_DEL_LIVE).toEqual({
      puedeEncender: true,
      vehiculos: true,
      origenes: 'todos',
      cotizaciones: true,
      clientes: 'apagado',
      logistica: 'apagado',
      repuestos: 'apagado',
      inicio: false,
      origenesConfig: 'apagado',
    })
    expect(Object.keys(AJUSTES_POR_DEFECTO_DEL_LIVE).sort()).toEqual([...CAMPOS_DEL_LIVE].sort())
  })
})

describe('esquemaDeAjustesDelLive', () => {
  it('acepta los por defecto y una lista de orígenes', () => {
    expect(esquemaDeAjustesDelLive.safeParse(AJUSTES_POR_DEFECTO_DEL_LIVE).success).toBe(true)
    expect(
      esquemaDeAjustesDelLive.safeParse({ ...AJUSTES_POR_DEFECTO_DEL_LIVE, origenes: [O1] })
        .success,
    ).toBe(true)
  })

  it('rechaza una lista vacía con su mensaje, un id que no es uuid, un enum mal escrito y una clave de más', () => {
    const vacia = esquemaDeAjustesDelLive.safeParse({
      ...AJUSTES_POR_DEFECTO_DEL_LIVE,
      origenes: [],
    })
    expect(vacia.success).toBe(false)
    expect(vacia.error?.issues[0]?.message).toBe(
      'Elige al menos un origen o «Todos los orígenes activos».',
    )
    for (const malo of [
      { ...AJUSTES_POR_DEFECTO_DEL_LIVE, origenes: ['x'] },
      { ...AJUSTES_POR_DEFECTO_DEL_LIVE, clientes: 'todo' },
      { ...AJUSTES_POR_DEFECTO_DEL_LIVE, agenda: true },
    ]) {
      expect(esquemaDeAjustesDelLive.safeParse(malo).success).toBe(false)
    }
  })

  it('el de la persona acepta sólo lo que pisa', () => {
    expect(esquemaDeAjustesParcialesDelLive.safeParse({}).success).toBe(true)
    expect(esquemaDeAjustesParcialesDelLive.safeParse({ clientes: 'nombres' }).success).toBe(true)
    expect(esquemaDeAjustesParcialesDelLive.safeParse({ chat: true }).success).toBe(false)
  })
})

describe('ajustesDesdeLaBase y ajustesParaLaBase', () => {
  it('sin fila es null', () => {
    expect(ajustesDesdeLaBase(null)).toBeNull()
    expect(ajustesDesdeLaBase(undefined)).toBeNull()
  })

  it('pasa de snake_case a camelCase y vuelve igual', () => {
    const base = {
      puede_encender: false,
      vehiculos: true,
      origenes: [O1, O2],
      cotizaciones: false,
      clientes: 'completo',
      logistica: 'cadena',
      repuestos: 'estadisticas',
      inicio: true,
      origenes_config: 'lectura',
    }
    const ajustes = ajustesDesdeLaBase(base)
    expect(ajustes).toEqual({
      puedeEncender: false,
      vehiculos: true,
      origenes: [O1, O2],
      cotizaciones: false,
      clientes: 'completo',
      logistica: 'cadena',
      repuestos: 'estadisticas',
      inicio: true,
      origenesConfig: 'lectura',
    })
    expect(ajustesParaLaBase(ajustes ?? {})).toEqual(base)
  })

  it('un parcial queda parcial', () => {
    expect(ajustesDesdeLaBase({ clientes: 'nombres' })).toEqual({ clientes: 'nombres' })
    expect(ajustesParaLaBase({ origenesConfig: 'apagado' })).toEqual({ origenes_config: 'apagado' })
  })

  it('una forma que la base no guardaría es un error', () => {
    expect(() => ajustesDesdeLaBase({ clientes: 'todo' })).toThrow()
    expect(() => ajustesDesdeLaBase({ puedeEncender: true })).toThrow()
    expect(() => ajustesDesdeLaBase('todos')).toThrow()
  })

  it('manda la lista de orígenes sin repetidos', () => {
    expect(ajustesParaLaBase({ origenes: [O1, O2, O1] })).toEqual({ origenes: [O1, O2] })
    expect(ajustesParaLaBase({ origenes: 'todos' })).toEqual({ origenes: 'todos' })
  })
})

describe('camposPisados', () => {
  it('cuenta lo que pisa, a lo sumo todos los campos', () => {
    expect(camposPisados(null)).toBe(0)
    expect(camposPisados({})).toBe(0)
    expect(camposPisados({ clientes: 'nombres', inicio: false })).toBe(2)
    expect(camposPisados(AJUSTES_POR_DEFECTO_DEL_LIVE)).toBe(CAMPOS_DEL_LIVE.length)
  })
})
