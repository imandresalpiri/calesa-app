import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import type { ClavePermiso, Permisos } from '@/shared/lib/permisos'
import {
  DESTINOS_DE_BUSQUEDA,
  DESTINOS_FUERA_DE_CONFIGURACION,
  destinosDeLaSeccion,
  destinosFueraDeConfiguracion,
} from './destinos-de-busqueda'
import { PANELES_PARA_TODOS } from './origenes/paneles-para-todos'
import { SECCIONES } from './secciones'

const APP = path.join(process.cwd(), 'src/app/(app)')
const con = (...claves: ClavePermiso[]): Permisos =>
  claves.map((clave) => ({ clave, origenId: null, alcance: 'todos' as const }))

describe('los destinos de búsqueda de Configuración', () => {
  it('son los colores y la vigencia, en Orígenes, y los niveles y quién crea y quién ve, en Roles', () => {
    expect(DESTINOS_DE_BUSQUEDA.map((d) => [d.seccion, d.titulo, d.ruta])).toEqual([
      ['origenes', 'Colores', '/configuracion/origenes?panel=colores'],
      ['origenes', 'Vigencia', '/configuracion/origenes?panel=vigencia'],
      ['roles', 'Niveles de acceso', '/configuracion/roles?bloque=cotizaciones'],
      ['roles', 'Quién crea y quién ve', '/configuracion/roles?bloque=cotizaciones'],
    ])
  })

  it('cada uno es de una sección del registro y su ruta, sin consulta, tiene su página o su route.ts', () => {
    for (const destino of DESTINOS_DE_BUSQUEDA) {
      const seccion = SECCIONES.find((s) => s.clave === destino.seccion)
      expect(seccion, destino.clave).toBeDefined()
      const [ruta] = destino.ruta.split('?')
      expect(ruta?.startsWith(seccion?.ruta ?? '#'), destino.clave).toBe(true)
      const existe =
        existsSync(path.join(APP, ruta ?? '', 'page.tsx')) ||
        existsSync(path.join(APP, ruta ?? '', 'route.ts'))
      expect(existe, destino.ruta).toBe(true)
    }
  })

  it('el panel de cada ruta es uno de los que abre el bloque «Para todos los orígenes»', () => {
    for (const destino of DESTINOS_DE_BUSQUEDA.filter((d) => d.seccion === 'origenes')) {
      const panel = new URL(destino.ruta, 'http://localhost').searchParams.get('panel')
      expect(PANELES_PARA_TODOS as readonly (string | null)[], destino.clave).toContain(panel)
    }
  })

  it('los de Roles dejan a la vista el bloque «Cotizaciones» y se ofrecen sólo con `equipo.roles.*`', () => {
    for (const destino of DESTINOS_DE_BUSQUEDA.filter((d) => d.seccion === 'roles')) {
      const url = new URL(destino.ruta, 'http://localhost')
      expect(url.searchParams.get('bloque'), destino.clave).toBe('cotizaciones')
      expect(destino.permisos, destino.clave).toEqual([
        'equipo.roles.ver',
        'equipo.roles.gestionar',
      ])
    }
    expect(destinosDeLaSeccion('roles', con('equipo.roles.ver')).map((d) => d.clave)).toEqual([
      'niveles-de-acceso',
      'quien-crea-y-quien-ve',
    ])
    expect(destinosDeLaSeccion('roles', con('cotizaciones.configurar'))).toEqual([])
  })

  it('los claves no se repiten dentro de una sección', () => {
    const claves = DESTINOS_DE_BUSQUEDA.map((d) => `${d.seccion}-${d.clave}`)
    expect(new Set(claves).size).toBe(claves.length)
  })

  it('se ofrecen a quien tiene sus permisos y, sin ellos, a nadie; no llevan los permisos al navegador', () => {
    expect(
      destinosDeLaSeccion('origenes', con('cotizaciones.configurar')).map((d) => d.clave),
    ).toEqual(['colores', 'vigencia'])
    expect(destinosDeLaSeccion('origenes', con('origenes.gestionar'))).toEqual([])
    expect(destinosDeLaSeccion('catalogos', con('cotizaciones.configurar'))).toEqual([])
    expect(
      Object.keys(destinosDeLaSeccion('origenes', con('cotizaciones.configurar'))[0] ?? {}),
    ).toEqual(['clave', 'titulo', 'ruta', 'palabras'])
  })
})

describe('los destinos de búsqueda fuera de Configuración', () => {
  it('son los cuatro catálogos de logística, en Logística › Configuración', () => {
    expect(DESTINOS_FUERA_DE_CONFIGURACION.map((d) => [d.lugar, d.titulo, d.ruta])).toEqual([
      ['Logística', 'Puertos', '/logistica/configuracion/puertos'],
      ['Logística', 'Navieras', '/logistica/configuracion/navieras'],
      ['Logística', 'Categorías de gasto', '/logistica/configuracion/categorias-de-gasto'],
      ['Logística', 'Tipos de documento', '/logistica/configuracion/tipos-de-documento'],
    ])
  })

  it('cada ruta tiene su página y las claves no se repiten', () => {
    for (const destino of DESTINOS_FUERA_DE_CONFIGURACION) {
      expect(
        existsSync(path.join(APP, destino.ruta, 'page.tsx')) ||
          existsSync(path.join(APP, destino.ruta, 'route.ts')),
        destino.ruta,
      ).toBe(true)
    }
    const claves = DESTINOS_FUERA_DE_CONFIGURACION.map((d) => d.clave)
    expect(new Set(claves).size).toBe(claves.length)
  })

  it('se ofrecen a quien tiene sus permisos: los tipos de documento, también a quien configura un flujo o los repuestos', () => {
    expect(
      destinosFueraDeConfiguracion(con('logistica.catalogos.gestionar')).map((d) => d.clave),
    ).toEqual(['puertos', 'navieras', 'categorias-de-gasto', 'tipos-de-documento'])
    expect(destinosFueraDeConfiguracion(con('flujos.configurar')).map((d) => d.clave)).toEqual([
      'tipos-de-documento',
    ])
    expect(destinosFueraDeConfiguracion(con('repuestos.configurar')).map((d) => d.clave)).toEqual([
      'tipos-de-documento',
    ])
    expect(destinosFueraDeConfiguracion(con('cotizaciones.configurar'))).toEqual([])
  })

  it('no llevan los permisos al navegador', () => {
    expect(
      Object.keys(destinosFueraDeConfiguracion(con('logistica.catalogos.gestionar'))[0] ?? {}),
    ).toEqual(['clave', 'lugar', 'titulo', 'ruta', 'palabras'])
  })
})
