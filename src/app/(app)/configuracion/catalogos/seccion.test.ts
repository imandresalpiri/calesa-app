import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import type { ClavePermiso, Permisos } from '@/shared/lib/permisos'
import { conSubseccionesVisibles, primeraSubseccionAbierta, seccionesVisibles } from '../secciones'
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

  it('ya no tiene sub-secciones ni permisos: nadie la ve y no hay a dónde abrir', () => {
    expect(SECCION_DE_CATALOGOS.subsecciones).toEqual([])
    expect([...SECCION_DE_CATALOGOS.permisos]).toEqual([])
    for (const clave of ['cotizaciones.configurar', 'logistica.catalogos.gestionar'] as const) {
      const permisos = con(clave)
      expect(conSubseccionesVisibles(SECCION_DE_CATALOGOS, permisos).subsecciones).toEqual([])
      expect(primeraSubseccionAbierta(SECCION_DE_CATALOGOS, permisos)).toBeNull()
      expect(seccionesVisibles(permisos).map((s) => s.clave)).not.toContain('catalogos')
    }
  })
})

describe('Lo que se mudó de Catálogos', () => {
  it('los catálogos de logística ya no tienen página aquí: sus rutas viejas las redirige next.config.ts', () => {
    for (const vieja of ['puertos', 'navieras', 'categorias-de-gasto', 'tipos-de-documento']) {
      expect(existsSync(path.join(APP, 'configuracion/catalogos', vieja)), vieja).toBe(false)
    }
  })

  it('Tablas, Colores, Vigencia, Niveles y Quién crea y quién ve ya no son catálogos: sus rutas viejas sólo redirigen (route.ts), sin página', () => {
    for (const vieja of ['tablas', 'colores', 'vigencia', 'niveles', 'quien-crea-y-quien-ve']) {
      expect(existsSync(path.join(APP, 'configuracion/catalogos', vieja, 'route.ts')), vieja).toBe(
        true,
      )
      for (const pagina of ['page.tsx', 'loading.tsx']) {
        expect(existsSync(path.join(APP, 'configuracion/catalogos', vieja, pagina)), vieja).toBe(
          false,
        )
      }
    }
  })
})
