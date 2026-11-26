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

  it('cada uno es de una sección del registro y su ruta, sin consulta, está bajo esa sección y tiene su página', () => {
    for (const destino of DESTINOS_DE_BUSQUEDA) {
      const seccion = SECCIONES.find((s) => s.clave === destino.seccion)
      expect(seccion, destino.clave).toBeDefined()
      const [ruta] = destino.ruta.split('?')
      expect(ruta?.startsWith(seccion?.ruta ?? '#'), destino.clave).toBe(true)
      expect(existsSync(path.join(APP, ruta ?? '', 'page.tsx')), destino.ruta).toBe(true)
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
  it('son las tres pestañas de Repuestos › Configuración y los tipos de documento del flujo de repuestos', () => {
    expect(DESTINOS_FUERA_DE_CONFIGURACION.map((d) => [d.lugar, d.titulo, d.ruta])).toEqual([
      ['Repuestos', 'Flujo de repuestos', '/repuestos/configuracion/flujo'],
      [
        'Repuestos › Flujo de repuestos',
        'Tipos de documento',
        '/repuestos/configuracion/flujo?panel=tipos-de-documento',
      ],
      ['Repuestos', 'Cotizador de repuestos', '/repuestos/configuracion/cotizador'],
      ['Repuestos', 'Catálogos de repuestos', '/repuestos/configuracion/catalogos'],
    ])
  })

  it('cada ruta, sin consulta, tiene su página y las claves no se repiten', () => {
    for (const destino of DESTINOS_FUERA_DE_CONFIGURACION) {
      const sinConsulta = destino.ruta.split('?')[0] ?? destino.ruta
      expect(existsSync(path.join(APP, sinConsulta, 'page.tsx')), destino.ruta).toBe(true)
    }
    const claves = DESTINOS_FUERA_DE_CONFIGURACION.map((d) => d.clave)
    expect(new Set(claves).size).toBe(claves.length)
  })

  it('se ofrecen a quien tiene sus permisos: los de Repuestos, a quien los configura', () => {
    expect(destinosFueraDeConfiguracion(con('logistica.catalogos.gestionar'))).toEqual([])
    expect(destinosFueraDeConfiguracion(con('flujos.configurar'))).toEqual([])
    expect(destinosFueraDeConfiguracion(con('repuestos.configurar')).map((d) => d.clave)).toEqual([
      'flujo-de-repuestos',
      'tipos-de-documento-de-repuestos',
      'cotizador-de-repuestos',
      'catalogos-de-repuestos',
    ])
    expect(destinosFueraDeConfiguracion(con('cotizaciones.configurar'))).toEqual([])
  })

  it('no llevan los permisos al navegador', () => {
    expect(Object.keys(destinosFueraDeConfiguracion(con('repuestos.configurar'))[0] ?? {})).toEqual(
      ['clave', 'lugar', 'titulo', 'ruta', 'palabras'],
    )
  })
})
