import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { RUTAS } from '@/shared/lib/rutas'
import { PESTANAS_DE_LA_CONFIGURACION } from './pestanas'

const APP = path.join(process.cwd(), 'src/app/(app)')

describe('las pestañas de Repuestos › Configuración', () => {
  it('son Flujo, Cotizador y Catálogos, cada una una sub-ruta de la configuración', () => {
    expect(PESTANAS_DE_LA_CONFIGURACION.map((p) => [p.titulo, p.ruta])).toEqual([
      ['Flujo', '/repuestos/configuracion/flujo'],
      ['Cotizador', '/repuestos/configuracion/cotizador'],
      ['Catálogos', '/repuestos/configuracion/catalogos'],
    ])
    for (const pestana of PESTANAS_DE_LA_CONFIGURACION) {
      expect(pestana.ruta).toBe(`${RUTAS.configuracionDeRepuestos}/${pestana.clave}`)
    }
  })

  it('cada una tiene su página y su esqueleto', () => {
    for (const pestana of PESTANAS_DE_LA_CONFIGURACION) {
      expect(existsSync(path.join(APP, pestana.ruta, 'page.tsx')), pestana.ruta).toBe(true)
      expect(existsSync(path.join(APP, pestana.ruta, 'loading.tsx')), pestana.ruta).toBe(true)
    }
  })
})
