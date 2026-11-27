import { describe, expect, it } from 'vitest'
import { CLAVES_PERMISO, origenesCon, puede, type Permisos } from '@/shared/lib/permisos'
import { AJUSTES_POR_DEFECTO_DEL_LIVE, type AjustesDelLive } from './live'
import { permisosDelLive } from './live-permisos'

const O1 = '00000000-0000-4000-8000-0000000000a1'
const O2 = '00000000-0000-4000-8000-0000000000a2'
const O3 = '00000000-0000-4000-8000-0000000000a3'

// Todo el catálogo, en todos los orígenes: lo que tiene el rol `dueno`.
const TODOS: Permisos = CLAVES_PERMISO.map((clave) => ({ clave, origenId: null, alcance: 'todos' }))

function con(ajustes: Partial<AjustesDelLive>): AjustesDelLive {
  return { ...AJUSTES_POR_DEFECTO_DEL_LIVE, ...ajustes }
}

function claves(permisos: Permisos): string[] {
  return [...new Set(permisos.map((c) => c.clave))].sort()
}

describe('permisosDelLive', () => {
  it('por defecto deja sólo vehículos, cotizaciones y artes (sin configurar la fórmula)', () => {
    const quedan = claves(permisosDelLive(TODOS, AJUSTES_POR_DEFECTO_DEL_LIVE))
    expect(
      quedan.every(
        (c) =>
          c.startsWith('vehiculos.') || c.startsWith('cotizaciones.') || c.startsWith('artes.'),
      ),
    ).toBe(true)
    expect(quedan).toContain('vehiculos.ver')
    expect(quedan).toContain('cotizaciones.crear')
    expect(quedan).not.toContain('cotizaciones.configurar')
  })

  it('siempre quita agenda, chat, notificaciones, actividad, datos, web, equipo, empresa, flujos, orígenes y el Live mismo', () => {
    const todoEncendido = con({
      clientes: 'completo',
      logistica: 'cadena',
      repuestos: 'estadisticas',
      inicio: true,
      origenesConfig: 'lectura',
    })
    const quedan = claves(permisosDelLive(TODOS, todoEncendido))
    for (const prefijo of [
      'agenda.',
      'chat.',
      'notificaciones.',
      'actividad.',
      'datos.',
      'web.',
      'equipo.',
      'empresa.',
      'flujos.',
      'origenes.',
      'live.',
    ]) {
      expect(quedan.filter((c) => c.startsWith(prefijo))).toEqual([])
    }
  })

  it('cada valor deja lo suyo, y nada más', () => {
    const tabla: [Partial<AjustesDelLive>, string, boolean][] = [
      [{ vehiculos: false }, 'vehiculos.ver', false],
      [{ cotizaciones: false }, 'cotizaciones.ver', false],
      [{ cotizaciones: true }, 'artes.empresa.gestionar', true],
      [{ cotizaciones: false }, 'artes.empresa.gestionar', false],
      [{ clientes: 'apagado' }, 'leads.ver', false],
      [{ clientes: 'nombres' }, 'leads.ver', false],
      [{ clientes: 'completo' }, 'leads.ver', true],
      [{ clientes: 'completo' }, 'leads.crear', true],
      [{ logistica: 'cadena' }, 'logistica.ver', true],
      [{ logistica: 'cadena' }, 'logistica.gastos.ver', false],
      [{ logistica: 'apagado' }, 'logistica.ver', false],
      [{ repuestos: 'estadisticas' }, 'repuestos.ver', true],
      [{ repuestos: 'estadisticas' }, 'repuestos.costos.ver', false],
      [{ inicio: true }, 'tablero.metricas.ver', true],
      [{ inicio: false }, 'tablero.metricas.ver', false],
      [{ origenesConfig: 'lectura' }, 'cotizaciones.configurar', true],
      [{ origenesConfig: 'lectura', cotizaciones: false }, 'cotizaciones.configurar', false],
    ]
    for (const [ajustes, clave, esperado] of tabla) {
      const recortados = permisosDelLive(TODOS, con(ajustes))
      expect(
        recortados.some((c) => c.clave === clave),
        `${JSON.stringify(ajustes)} → ${clave}`,
      ).toBe(esperado)
    }
  })
})

describe('permisosDelLive por origen', () => {
  it('nunca suma lo que la persona no tiene', () => {
    const propios: Permisos = [{ clave: 'vehiculos.ver', origenId: O1, alcance: 'propios' }]
    expect(permisosDelLive(propios, con({ clientes: 'completo' }))).toEqual(propios)
  })

  it('con algunos orígenes: reparte «en todos» por cada uno y quita los de afuera', () => {
    const permisos: Permisos = [
      { clave: 'vehiculos.ver', origenId: null, alcance: 'todos' },
      { clave: 'cotizaciones.crear', origenId: O3, alcance: 'propios' },
      { clave: 'cotizaciones.ver', origenId: O2, alcance: 'todos' },
      { clave: 'logistica.ver', origenId: null, alcance: 'todos' },
      { clave: 'repuestos.ver', origenId: null, alcance: 'todos' },
    ]
    const recortados = permisosDelLive(
      permisos,
      con({ origenes: [O1, O2], logistica: 'cadena', repuestos: 'estadisticas' }),
    )
    expect(origenesCon(recortados, 'vehiculos.ver')).toEqual([O1, O2])
    expect(origenesCon(recortados, 'logistica.ver')).toEqual([O1, O2])
    expect(puede(recortados, 'cotizaciones.crear')).toBe(false)
    expect(origenesCon(recortados, 'cotizaciones.ver')).toEqual([O2])
    // Repuestos no va por origen: queda tal cual.
    expect(recortados).toContainEqual({ clave: 'repuestos.ver', origenId: null, alcance: 'todos' })
  })

  it('con «todos» deja las concesiones tal cual', () => {
    const permisos: Permisos = [{ clave: 'vehiculos.editar', origenId: O3, alcance: 'propios' }]
    expect(permisosDelLive(permisos, AJUSTES_POR_DEFECTO_DEL_LIVE)).toEqual(permisos)
  })
})
