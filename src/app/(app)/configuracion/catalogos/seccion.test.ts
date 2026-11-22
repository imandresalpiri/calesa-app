import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import type { ClavePermiso, Permisos } from '@/shared/lib/permisos'
import { conSubseccionesVisibles, primeraSubseccionAbierta } from '../secciones'
import { SECCION_DE_CATALOGOS } from './seccion'

const con = (...claves: ClavePermiso[]): Permisos =>
  claves.map((clave) => ({ clave, origenId: null, alcance: 'todos' as const }))

const APP = path.join(process.cwd(), 'src/app/(app)')

describe('la sección Catálogos de Configuración', () => {
  it('es de Operación, con su ruta, y no tiene página propia sino su route.ts', () => {
    expect(SECCION_DE_CATALOGOS.grupo).toBe('operacion')
    expect(SECCION_DE_CATALOGOS.ruta).toBe('/configuracion/catalogos')
    expect(existsSync(path.join(APP, 'configuracion/catalogos/route.ts'))).toBe(true)
  })

  it('sólo queda Tablas compartidas, sin rótulo: la logística vive en Logística › Configuración', () => {
    expect(
      SECCION_DE_CATALOGOS.subsecciones.map((sub) => [sub.titulo, sub.ruta, sub.grupo ?? null]),
    ).toEqual([['Tablas compartidas', '/configuracion/catalogos/tablas', null]])
  })

  it('cada catálogo lleva a una página que existe', () => {
    for (const sub of SECCION_DE_CATALOGOS.subsecciones) {
      expect(existsSync(path.join(APP, sub.ruta, 'page.tsx')), sub.clave).toBe(true)
    }
  })

  it('se abre sólo con `cotizaciones.configurar`', () => {
    expect([...SECCION_DE_CATALOGOS.permisos]).toEqual(['cotizaciones.configurar'])
  })

  it('quien configura la cotización ve las tablas compartidas, y la sección abre ahí', () => {
    const permisos = con('cotizaciones.configurar')
    const visibles = conSubseccionesVisibles(SECCION_DE_CATALOGOS, permisos)
    expect(visibles.subsecciones.map((sub) => [sub.clave, sub.apagada ?? false])).toEqual([
      ['tablas', false],
    ])
    expect(primeraSubseccionAbierta(SECCION_DE_CATALOGOS, permisos)).toBe(
      '/configuracion/catalogos/tablas',
    )
  })

  it('quien sólo gestiona los catálogos de logística o configura un flujo no ve nada aquí', () => {
    for (const clave of ['logistica.catalogos.gestionar', 'flujos.configurar'] as const) {
      expect(primeraSubseccionAbierta(SECCION_DE_CATALOGOS, con(clave))).toBeNull()
    }
  })

  it('sin permisos, nada que abrir', () => {
    expect(primeraSubseccionAbierta(SECCION_DE_CATALOGOS, [])).toBeNull()
  })
})

describe('Lo que se mudó de Catálogos', () => {
  it('los catálogos de logística ya no tienen página aquí: sus rutas viejas las redirige next.config.ts', () => {
    for (const vieja of ['puertos', 'navieras', 'categorias-de-gasto', 'tipos-de-documento']) {
      expect(existsSync(path.join(APP, 'configuracion/catalogos', vieja)), vieja).toBe(false)
    }
  })

  it('Colores, Vigencia, Niveles y Quién crea y quién ve ya no son catálogos: sus rutas viejas sólo redirigen (route.ts), sin página', () => {
    const claves = SECCION_DE_CATALOGOS.subsecciones.map((sub) => sub.clave)
    for (const vieja of ['colores', 'vigencia', 'niveles', 'quien-crea-y-quien-ve']) {
      expect(claves).not.toContain(vieja)
      expect(existsSync(path.join(APP, 'configuracion/catalogos', vieja, 'route.ts')), vieja).toBe(
        true,
      )
      expect(existsSync(path.join(APP, 'configuracion/catalogos', vieja, 'page.tsx')), vieja).toBe(
        false,
      )
    }
  })
})
