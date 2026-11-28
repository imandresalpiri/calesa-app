import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import type { EstadoDelLive } from '@/modules/equipo/shell.client'
import { CLAVES_PERMISO, type Concesion, type Permisos } from '@/shared/lib/permisos'
import { LIVE_APAGADO_DE_PRUEBA as APAGADO, liveEncendido } from './live.soporte'
import { NAVEGACION, entradasVisibles, estaEn, type EntradaNav } from './navegacion'

// `equipo/shell.client` reexporta hooks cuyas Server Actions importan `server-only`: en Vitest el import llega entero y cae. Aquí sólo se usa `seOcultaEnElLive`.
vi.mock('server-only', () => ({}))

const CARPETA_APP = path.join(process.cwd(), 'src/app/(app)')

function concesiones(...claves: Concesion['clave'][]): Permisos {
  return claves.map((clave) => ({ clave, origenId: null, alcance: 'todos' }))
}

describe('NAVEGACION', () => {
  it.each(NAVEGACION.map((entrada) => [entrada.ruta, entrada.disponible] as const))(
    '%s: «disponible» dice la verdad sobre si la pantalla existe',
    (ruta, disponible) => {
      const pagina = path.join(CARPETA_APP, ruta, 'page.tsx')
      expect(existsSync(pagina)).toBe(disponible)
    },
  )

  it('no repite claves ni rutas', () => {
    expect(new Set(NAVEGACION.map((entrada) => entrada.clave)).size).toBe(NAVEGACION.length)
    expect(new Set(NAVEGACION.map((entrada) => entrada.ruta)).size).toBe(NAVEGACION.length)
  })

  it('la barra lateral no pasa de 9 entradas (8 más Repuestos)', () => {
    expect(NAVEGACION.filter((entrada) => entrada.zona === 'principal').length).toBeLessThanOrEqual(
      9,
    )
  })
})

describe('entradasVisibles', () => {
  it('sin ningún permiso se ven Inicio, Agenda, Perfil y Datos (los de todos) y nada roto', () => {
    expect(entradasVisibles([], 'principal', APAGADO).map((entrada) => entrada.clave)).toEqual([
      'inicio',
      'agenda',
    ])
    expect(entradasVisibles([], 'usuario', APAGADO).map((entrada) => entrada.clave)).toEqual([
      'perfil',
      'datos',
    ])
  })

  it('nunca muestra una entrada sin pantalla, ni con todos los permisos', () => {
    const todo = concesiones(...CLAVES_PERMISO)
    const visibles = [
      ...entradasVisibles(todo, 'principal', APAGADO),
      ...entradasVisibles(todo, 'usuario', APAGADO),
    ]
    expect(visibles.every((entrada) => entrada.disponible)).toBe(true)
    expect(visibles.length).toBe(
      NAVEGACION.filter((entrada: EntradaNav) => entrada.disponible).length,
    )
  })

  it('con cotizaciones.ver se ve Cotizaciones; sin él, no', () => {
    const con = entradasVisibles(concesiones('cotizaciones.ver'), 'principal', APAGADO)
    expect(con.map((entrada) => entrada.clave)).toContain('cotizaciones')
    const sin = entradasVisibles(concesiones('vehiculos.ver'), 'principal', APAGADO)
    expect(sin.map((entrada) => entrada.clave)).not.toContain('cotizaciones')
  })

  it('una entrada con permisos pide alguno de ellos', () => {
    const leads = NAVEGACION.find((entrada) => entrada.clave === 'leads')
    expect(leads?.permisos).toEqual(['leads.ver'])
  })
})

describe('entradasVisibles con el Modo Live', () => {
  const todo = concesiones(...CLAVES_PERMISO)
  const claves = (live: EstadoDelLive, zona: 'principal' | 'usuario') =>
    entradasVisibles(todo, zona, live).map((entrada) => entrada.clave)

  it('por defecto, sólo Vehículos, Cotizaciones y Artes; el menú del usuario, vacío', () => {
    expect(claves(liveEncendido(), 'principal')).toEqual(['vehiculos', 'cotizaciones', 'artes'])
    expect(claves(liveEncendido(), 'usuario')).toEqual([])
  })

  it('Leads sólo con «Completo»; Logística con «Sólo la cadena»; Agenda nunca', () => {
    expect(claves(liveEncendido({ clientes: 'nombres' }), 'principal')).not.toContain('leads')
    expect(claves(liveEncendido({ clientes: 'completo' }), 'principal')).toContain('leads')
    expect(claves(liveEncendido({ logistica: 'cadena' }), 'principal')).toContain('logistica')
    const todoEncendido = liveEncendido({
      clientes: 'completo',
      logistica: 'cadena',
      repuestos: 'estadisticas',
      inicio: true,
      origenesConfig: 'lectura',
    })
    expect(claves(todoEncendido, 'principal')).not.toContain('agenda')
    expect(claves(todoEncendido, 'principal')).not.toContain('chat')
    expect(claves(todoEncendido, 'usuario')).toEqual(['tablero', 'configuracion'])
  })

  it('apagado, el Live no quita nada', () => {
    expect(claves(APAGADO, 'principal')).toContain('agenda')
  })
})

describe('estaEn', () => {
  it('el inicio sólo es el inicio', () => {
    expect(estaEn('/', '/')).toBe(true)
    expect(estaEn('/perfil', '/')).toBe(false)
  })

  it('una ruta hija pertenece a su entrada, una parecida no', () => {
    expect(estaEn('/leads/123', '/leads')).toBe(true)
    expect(estaEn('/leads', '/leads')).toBe(true)
    expect(estaEn('/leads-viejos', '/leads')).toBe(false)
  })
})
