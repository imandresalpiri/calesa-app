import { describe, expect, it } from 'vitest'
import { CLAVES_PERMISO, type Concesion, type Permisos } from '@/shared/lib/permisos'
import { BLOQUES_BANDEJA, bloqueVisible, bloquesVisibles } from './bandeja'

function concesiones(...claves: Concesion['clave'][]): Permisos {
  return claves.map((clave) => ({ clave, origenId: null, alcance: 'todos' }))
}

describe('bloquesVisibles', () => {
  it('sin permisos no hay bloques', () => {
    expect(bloquesVisibles([])).toEqual([])
  })

  it('quien vende ve lo suyo y nada de logística', () => {
    const claves = bloquesVisibles(concesiones('leads.ver', 'leads.crear')).map((b) => b.clave)
    expect(claves).toEqual(['recordatorios', 'leads-sin-seguimiento', 'turnos-web'])
  })

  it('quien mueve vehículos ve lo suyo y nada de leads', () => {
    const claves = bloquesVisibles(
      concesiones('logistica.ver', 'logistica.documentos.aprobar'),
    ).map((b) => b.clave)
    expect(claves).toEqual(['vehiculos-trabados', 'documentos-por-aprobar', 'alertas-demora'])
  })

  it('quien tiene dos roles ve la unión, sin repetir y en el orden de la bandeja', () => {
    const claves = bloquesVisibles(
      concesiones(
        'logistica.documentos.aprobar',
        'logistica.ver',
        'agenda.tareas.recibir',
        'leads.crear',
        'leads.ver',
        'web.cola.gestionar',
      ),
    ).map((b) => b.clave)
    expect(claves).toEqual([
      'recordatorios',
      'leads-sin-seguimiento',
      'turnos-web',
      'vehiculos-trabados',
      'documentos-por-aprobar',
      'alertas-demora',
      'tareas',
    ])
  })

  it('quien sólo aprueba documentos de repuestos no ve «Documentos por aprobar» (la bandeja sólo trae los de vehículos)', () => {
    const claves = bloquesVisibles(
      concesiones('repuestos.ver', 'repuestos.mover', 'repuestos.documentos.aprobar'),
    ).map((b) => b.clave)
    expect(claves).toEqual(['repuestos-por-mover', 'esperas-repuestos'])
  })

  it('quien administra el equipo ve «Personas sin rol» y nada más', () => {
    const claves = bloquesVisibles(concesiones('equipo.usuarios.gestionar')).map((b) => b.clave)
    expect(claves).toEqual(['equipo-sin-rol'])
  })

  it('un permiso acotado a un origen alcanza para ver el bloque', () => {
    const permisos: Permisos = [{ clave: 'logistica.ver', origenId: 'origen-1', alcance: 'todos' }]
    expect(bloquesVisibles(permisos).map((b) => b.clave)).toContain('vehiculos-trabados')
  })

  it('con todos los permisos se ven todos', () => {
    expect(bloquesVisibles(concesiones(...CLAVES_PERMISO))).toHaveLength(BLOQUES_BANDEJA.length)
  })
})

describe('BLOQUES_BANDEJA', () => {
  it('no repite claves y todo bloque exige al menos un permiso', () => {
    const claves = BLOQUES_BANDEJA.map((bloque) => bloque.clave)
    expect(new Set(claves).size).toBe(claves.length)
    for (const bloque of BLOQUES_BANDEJA) {
      expect(bloque.permisos.length).toBeGreaterThan(0)
    }
  })
})

describe('«Ver todos» de cada bloque', () => {
  it('el género sigue a lo que lista el bloque', () => {
    const porClave = Object.fromEntries(BLOQUES_BANDEJA.map((b) => [b.clave, b.verTodos]))
    expect(porClave).toEqual({
      recordatorios: 'Ver todos',
      'leads-sin-seguimiento': 'Ver todos',
      'turnos-web': 'Ver todos',
      'vehiculos-trabados': 'Ver todos',
      'documentos-por-aprobar': 'Ver todos',
      'alertas-demora': 'Ver todas',
      'repuestos-por-mover': 'Ver todos',
      'esperas-repuestos': 'Ver todas',
      tareas: 'Ver todas',
      'equipo-sin-rol': 'Ver todas',
    })
  })
})

describe('bloqueVisible', () => {
  it('trae el bloque sólo si quien mira cumple alguno de sus permisos', () => {
    expect(bloqueVisible(concesiones('leads.crear'), 'turnos-web')?.clave).toBe('turnos-web')
    expect(bloqueVisible(concesiones('web.cola.gestionar'), 'turnos-web')?.clave).toBe('turnos-web')
    expect(bloqueVisible(concesiones('leads.ver'), 'turnos-web')).toBeNull()
    expect(bloqueVisible([], 'turnos-web')).toBeNull()
  })
})
