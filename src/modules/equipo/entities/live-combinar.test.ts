import { describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import { AJUSTES_POR_DEFECTO_DEL_LIVE } from './live'
import {
  SIN_LIVE_DE_LA_SESION,
  combinarAjustesDelLive,
  estadoDelLive,
  liveDeLaSesionDesde,
  type LiveDeLaSesion,
} from './live-combinar'

const ROL = '00000000-0000-4000-8000-0000000000aa'
const O1 = '00000000-0000-4000-8000-0000000000a1'

const VE_LEADS: Permisos = [{ clave: 'leads.ver', origenId: null, alcance: 'todos' }]

function liveCon(
  rol: LiveDeLaSesion['rol'],
  persona: LiveDeLaSesion['persona'] = null,
): LiveDeLaSesion {
  return { rol, persona }
}

describe('combinarAjustesDelLive', () => {
  it('sin rol ni persona: todo por defecto', () => {
    const { ajustes, fuente } = combinarAjustesDelLive({ rol: null, persona: null })
    expect(ajustes).toEqual(AJUSTES_POR_DEFECTO_DEL_LIVE)
    expect(new Set(Object.values(fuente))).toEqual(new Set(['defecto']))
  })

  it('campo por campo: manda lo propio, después el rol, después lo por defecto', () => {
    const { ajustes, fuente } = combinarAjustesDelLive({
      rol: { logistica: 'cadena', clientes: 'apagado', origenes: [O1] },
      persona: { clientes: 'nombres' },
    })
    expect(ajustes).toEqual({
      ...AJUSTES_POR_DEFECTO_DEL_LIVE,
      logistica: 'cadena',
      clientes: 'nombres',
      origenes: [O1],
    })
    expect(fuente.clientes).toBe('propio')
    expect(fuente.logistica).toBe('rol')
    expect(fuente.origenes).toBe('rol')
    expect(fuente.vehiculos).toBe('defecto')
  })

  it('un ajuste propio sigue siendo propio aunque cambie el rol', () => {
    const persona = { inicio: true }
    for (const rol of [{ inicio: false }, { inicio: true }, null]) {
      const { ajustes, fuente } = combinarAjustesDelLive({ rol, persona })
      expect(ajustes.inicio).toBe(true)
      expect(fuente.inicio).toBe('propio')
    }
  })
})

describe('liveDeLaSesionDesde', () => {
  it('sin la clave (una respuesta vieja): lo por defecto', () => {
    expect(liveDeLaSesionDesde(undefined)).toEqual(SIN_LIVE_DE_LA_SESION)
    expect(liveDeLaSesionDesde(null)).toEqual(SIN_LIVE_DE_LA_SESION)
  })

  it('da forma al rol y a lo propio', () => {
    expect(
      liveDeLaSesionDesde({
        rol: { id: ROL, nombre: 'Vendedor', ajustes: { puede_encender: false } },
        persona: { origenes_config: 'lectura' },
      }),
    ).toEqual({
      rol: { id: ROL, nombre: 'Vendedor', ajustes: { puedeEncender: false } },
      persona: { origenesConfig: 'lectura' },
    })
    expect(
      liveDeLaSesionDesde({ rol: { id: ROL, nombre: 'Vendedor', ajustes: null }, persona: null }),
    ).toEqual({ rol: { id: ROL, nombre: 'Vendedor', ajustes: null }, persona: null })
  })

  it('una forma inesperada es un error', () => {
    expect(() => liveDeLaSesionDesde({ rol: { id: 'x', nombre: 'A', ajustes: null } })).toThrow()
  })
})

describe('estadoDelLive', () => {
  it('sin la cookie: apagado, y se puede encender por defecto', () => {
    expect(estadoDelLive({ cookie: false, live: SIN_LIVE_DE_LA_SESION, permisos: [] })).toEqual({
      encendido: false,
      puedeEncender: true,
    })
  })

  it('con la cookie: encendido con lo combinado', () => {
    expect(estadoDelLive({ cookie: true, live: SIN_LIVE_DE_LA_SESION, permisos: [] })).toEqual({
      encendido: true,
      puedeEncender: true,
      ajustes: AJUSTES_POR_DEFECTO_DEL_LIVE,
      nombresDeClientes: false,
    })
  })

  it('si su rol no deja encenderlo, queda apagado aunque la cookie diga que no', () => {
    const live = liveCon({ id: ROL, nombre: 'Visita', ajustes: { puedeEncender: false } })
    expect(estadoDelLive({ cookie: true, live, permisos: [] })).toEqual({
      encendido: false,
      puedeEncender: false,
    })
  })

  it('lo propio de la persona pisa lo del rol también para encender', () => {
    const live = liveCon(
      { id: ROL, nombre: 'Visita', ajustes: { puedeEncender: false } },
      { puedeEncender: true },
    )
    expect(estadoDelLive({ cookie: false, live, permisos: [] }).puedeEncender).toBe(true)
  })

  it('«Sólo nombres» lee los nombres sólo si quien mira ve leads de verdad', () => {
    const live = liveCon({ id: ROL, nombre: 'Vendedor', ajustes: { clientes: 'nombres' } })
    const con = estadoDelLive({ cookie: true, live, permisos: VE_LEADS })
    const sin = estadoDelLive({ cookie: true, live, permisos: [] })
    expect(con.encendido && con.nombresDeClientes).toBe(true)
    expect(sin.encendido && sin.nombresDeClientes).toBe(false)
    const completo = estadoDelLive({
      cookie: true,
      live: liveCon({ id: ROL, nombre: 'Vendedor', ajustes: { clientes: 'completo' } }),
      permisos: VE_LEADS,
    })
    expect(completo.encendido && completo.nombresDeClientes).toBe(false)
  })
})
