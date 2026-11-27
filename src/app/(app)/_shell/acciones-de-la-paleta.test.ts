import { describe, expect, it, vi } from 'vitest'
import type { Concesion, Permisos } from '@/shared/lib/permisos'
import { PANEL_NUEVO_DE_VEHICULOS } from '@/shared/lib/rutas'
import { accionesDeLaPaleta, tiposDeLaPaleta } from './acciones-de-la-paleta'
import { LIVE_APAGADO_DE_PRUEBA as APAGADO, liveEncendido } from './live.soporte'

// `equipo/shell.client` reexporta hooks cuyas Server Actions importan `server-only`: en Vitest el import llega entero y cae. Aquí sólo se usa `seOcultaEnElLive`.
vi.mock('server-only', () => ({}))

function concesiones(...claves: Concesion['clave'][]): Permisos {
  return claves.map((clave) => ({ clave, origenId: null, alcance: 'todos' }))
}

const titulos = (permisos: Permisos) => accionesDeLaPaleta(permisos, APAGADO).map((a) => a.titulo)
const porClave = (permisos: Permisos, clave: string) =>
  accionesDeLaPaleta(permisos, APAGADO).find((a) => a.clave === clave)

describe('accionesDeLaPaleta: crear', () => {
  const asesora = concesiones('leads.crear', 'cotizaciones.crear', 'vehiculos.ver')

  it('ofrece sólo lo que el permiso deja crear', () => {
    expect(titulos(asesora)).toContain('Nuevo lead')
    expect(titulos(asesora)).toContain('Nueva cotización')
    expect(titulos(asesora)).not.toContain('Nuevo vehículo')
  })

  it('sin ningún permiso de crear no hay grupo «crear»', () => {
    const acciones = accionesDeLaPaleta(concesiones('vehiculos.ver'), APAGADO)
    expect(acciones.some((a) => a.grupo === 'crear')).toBe(false)
  })

  it('«Nuevo lead» abre el alta y «Nueva cotización» va a la hoja', () => {
    expect(porClave(asesora, 'nuevo-lead')?.destino).toEqual({ tipo: 'nuevo-lead' })
    expect(porClave(asesora, 'nueva-cotizacion')?.destino).toEqual({
      tipo: 'ruta',
      ruta: '/cotizaciones/nuevo',
    })
  })

  it('«Nuevo vehículo» abre el panel de alta con el valor compartido', () => {
    const dueña = concesiones('vehiculos.crear')
    expect(porClave(dueña, 'nuevo-vehiculo')?.destino).toEqual({
      tipo: 'ruta',
      ruta: `/vehiculos?panel=${PANEL_NUEVO_DE_VEHICULOS}`,
    })
  })
})

describe('accionesDeLaPaleta: ir a', () => {
  it('sin permiso de ver el equipo no hay «Configuración: Equipo»', () => {
    expect(titulos(concesiones('leads.crear'))).not.toContain('Configuración: Equipo')
  })

  it('con permiso de ver el equipo sí, y lleva a su ruta', () => {
    const accion = accionesDeLaPaleta(concesiones('equipo.usuarios.ver'), APAGADO).find(
      (a) => a.titulo === 'Configuración: Equipo',
    )
    expect(accion?.destino).toEqual({ tipo: 'ruta', ruta: '/configuracion/equipo' })
  })

  it('las entradas del menú visibles salen como «Ir a …»', () => {
    expect(titulos(concesiones())).toContain('Ir a Inicio')
  })
})

describe('accionesDeLaPaleta: forma', () => {
  it('«Ver atajos de teclado» siempre está', () => {
    expect(porClave([], 'ver-atajos')?.destino).toEqual({ tipo: 'atajos' })
  })

  it('son datos simples: ni iconos ni permisos cruzan al navegador', () => {
    const acciones = accionesDeLaPaleta(
      concesiones('leads.crear', 'vehiculos.crear', 'cotizaciones.crear', 'equipo.usuarios.ver'),
      APAGADO,
    )
    for (const accion of acciones) {
      expect(Object.keys(accion).sort()).toEqual([
        'clave',
        'destino',
        'grupo',
        'palabras',
        'titulo',
      ])
    }
    expect(JSON.parse(JSON.stringify(acciones))).toEqual(acciones)
  })

  it('las claves no se repiten (son el value de cada fila)', () => {
    const claves = accionesDeLaPaleta(
      concesiones('leads.crear', 'vehiculos.crear', 'cotizaciones.crear', 'equipo.usuarios.ver'),
      APAGADO,
    ).map((a) => a.clave)
    expect(new Set(claves).size).toBe(claves.length)
  })
})

describe('accionesDeLaPaleta con el Modo Live', () => {
  it('«Ir a» sólo lo que el Live muestra', () => {
    const todo = concesiones('leads.ver', 'vehiculos.ver', 'cotizaciones.ver', 'logistica.ver')
    const ir = accionesDeLaPaleta(todo, liveEncendido())
      .filter((a) => a.grupo === 'ir')
      .map((a) => a.clave)
    expect(ir).toEqual(['ir-vehiculos', 'ir-cotizaciones'])
  })
})

describe('tiposDeLaPaleta', () => {
  it('apagado, busca todo', () => {
    expect(tiposDeLaPaleta(APAGADO)).toEqual(['lead', 'vehiculo', 'cotizacion'])
  })

  it('encendido, los leads sólo con «Completo»', () => {
    expect(tiposDeLaPaleta(liveEncendido())).toEqual(['vehiculo', 'cotizacion'])
    expect(tiposDeLaPaleta(liveEncendido({ clientes: 'nombres' }))).toEqual([
      'vehiculo',
      'cotizacion',
    ])
    expect(tiposDeLaPaleta(liveEncendido({ clientes: 'completo' }))).toEqual([
      'lead',
      'vehiculo',
      'cotizacion',
    ])
  })

  it('con orígenes elegidos o la sección apagada, vehículos y cotizaciones no se buscan', () => {
    const origen = '00000000-0000-4000-8000-000000000001'
    expect(tiposDeLaPaleta(liveEncendido({ origenes: [origen] }))).toEqual([])
    expect(tiposDeLaPaleta(liveEncendido({ vehiculos: false }))).toEqual(['cotizacion'])
    expect(tiposDeLaPaleta(liveEncendido({ cotizaciones: false }))).toEqual(['vehiculo'])
  })
})
