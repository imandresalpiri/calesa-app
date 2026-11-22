import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import type { ClavePermiso, Permisos } from '@/shared/lib/permisos'
import { DESTINOS_DE_BUSQUEDA, destinosDeLaSeccion } from './destinos-de-busqueda'
import { PANELES_PARA_TODOS } from './origenes/paneles-para-todos'
import { SECCIONES } from './secciones'

const APP = path.join(process.cwd(), 'src/app/(app)')
const con = (...claves: ClavePermiso[]): Permisos =>
  claves.map((clave) => ({ clave, origenId: null, alcance: 'todos' as const }))

describe('los destinos de búsqueda de Configuración', () => {
  it('son los colores y la vigencia, en Orígenes', () => {
    expect(DESTINOS_DE_BUSQUEDA.map((d) => [d.seccion, d.titulo, d.ruta])).toEqual([
      ['origenes', 'Colores', '/configuracion/origenes?panel=colores'],
      ['origenes', 'Vigencia', '/configuracion/origenes?panel=vigencia'],
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
    for (const destino of DESTINOS_DE_BUSQUEDA) {
      const panel = new URL(destino.ruta, 'http://localhost').searchParams.get('panel')
      expect(PANELES_PARA_TODOS as readonly (string | null)[], destino.clave).toContain(panel)
    }
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
