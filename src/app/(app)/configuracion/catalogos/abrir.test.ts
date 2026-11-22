import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ClavePermiso, Permisos } from '@/shared/lib/permisos'

vi.mock('server-only', () => ({}))
const requerirSesion = vi.fn()
vi.mock('@/modules/equipo', () => ({ requerirSesion }))
const redirigir = vi.fn((destino: string) => {
  throw new Error(`redirige a ${destino}`)
})
vi.mock('@/shared/lib/navegacion', () => ({ redirigir }))

const { abrirCatalogo } = await import('./abrir')

const con = (...claves: ClavePermiso[]): Permisos =>
  claves.map((clave) => ({ clave, origenId: null, alcance: 'todos' as const }))

const conSesion = (permisos: Permisos) => requerirSesion.mockResolvedValue({ permisos })

describe('abrirCatalogo', () => {
  beforeEach(() => {
    requerirSesion.mockReset()
    redirigir.mockClear()
  })

  it('con el permiso de la sub-sección, la abre con su título', async () => {
    conSesion(con('cotizaciones.configurar'))
    const abierto = await abrirCatalogo('tablas')
    expect(abierto.sinPermiso).toBe(false)
    expect(abierto.sinPermiso ? null : abierto.sub.titulo).toBe('Tablas compartidas')
  })

  it('quien sólo gestiona los catálogos de logística no abre las tablas: lleva al inicio de lo que abra, o a «No tienes permiso»', async () => {
    conSesion(con('logistica.catalogos.gestionar'))
    expect(await abrirCatalogo('tablas')).toEqual({ sinPermiso: true })
  })

  it('Puertos, Navieras, Categorías de gasto y Tipos de documento ya no son catálogos de Configuración: viven en Logística', async () => {
    conSesion(con('cotizaciones.configurar'))
    for (const clave of ['puertos', 'navieras', 'categorias-de-gasto', 'tipos-de-documento']) {
      await expect(abrirCatalogo(clave), clave).rejects.toThrow(
        'redirige a /configuracion/catalogos/tablas',
      )
    }
  })

  it('Colores y Vigencia ya no son catálogos: no se abren aquí', async () => {
    conSesion(con('cotizaciones.configurar'))
    await expect(abrirCatalogo('colores')).rejects.toThrow(
      'redirige a /configuracion/catalogos/tablas',
    )
  })

  it('quien sólo ve roles no abre ningún catálogo: Niveles y Quién crea y quién ve ya no son de aquí', async () => {
    conSesion(con('equipo.roles.ver'))
    expect(await abrirCatalogo('tablas')).toEqual({ sinPermiso: true })
  })

  it('sin ninguna, «No tienes permiso»', async () => {
    conSesion(con('leads.ver'))
    expect(await abrirCatalogo('tablas')).toEqual({ sinPermiso: true })
  })
})
