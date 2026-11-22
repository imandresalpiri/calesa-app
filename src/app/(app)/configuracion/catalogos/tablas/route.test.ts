import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ClavePermiso, Permisos } from '@/shared/lib/permisos'

vi.mock('server-only', () => ({}))
vi.mock('next/server', async (importar) => {
  const real = await importar<Record<string, unknown>>()
  return { ...real, connection: () => Promise.resolve() }
})
const requerirSesion = vi.fn()
vi.mock('@/modules/equipo', () => ({ requerirSesion }))
const leerOrigenes = vi.fn()
vi.mock('@/modules/origenes', () => ({ leerOrigenes }))
const leerDondeSeUsaLaTabla = vi.fn()
vi.mock('@/modules/cotizaciones', () => ({ leerDondeSeUsaLaTabla }))

const { GET } = await import('./route')

const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'
const T = '44444444-4444-4444-8444-444444444444'

const configura = (...origenes: string[]): Permisos =>
  origenes.map((origenId) => ({
    clave: 'cotizaciones.configurar' as ClavePermiso,
    origenId,
    alcance: 'todos' as const,
  }))

const pedir = (ruta: string) => GET(new NextRequest(`http://localhost${ruta}`))

describe('/configuracion/catalogos/tablas', () => {
  beforeEach(() => {
    requerirSesion.mockReset()
    leerDondeSeUsaLaTabla.mockReset()
    leerOrigenes.mockResolvedValue({ ok: true, data: [{ id: A }, { id: B }] })
    requerirSesion.mockResolvedValue({ permisos: configura(A, B) })
  })

  it('sin consulta: 308 por persona al drawer del primer origen que configura', async () => {
    const respuesta = await pedir('/configuracion/catalogos/tablas')
    expect(respuesta.status).toBe(308)
    expect(respuesta.headers.get('Location')).toBe(
      `/configuracion/origenes/${A}/planilla?panel=tablas`,
    )
    expect(respuesta.headers.get('Cache-Control')).toBe('private, no-store')
    expect(leerDondeSeUsaLaTabla).not.toHaveBeenCalled()
  })

  it('con `?tabla=`: al primer origen que la recibe de los que configura', async () => {
    leerDondeSeUsaLaTabla.mockResolvedValue({ ok: true, data: { propiaDe: null, conPropia: [A] } })
    const respuesta = await pedir(`/configuracion/catalogos/tablas?tabla=${T}`)
    expect(respuesta.headers.get('Location')).toBe(
      `/configuracion/origenes/${B}/planilla?panel=tablas&tabla=${T}`,
    )
    expect(leerDondeSeUsaLaTabla).toHaveBeenCalledWith(T, [A, B])
  })

  it('con `?tabla=&panel=publicar-tabla`: el panel viaja en `accion`', async () => {
    leerDondeSeUsaLaTabla.mockResolvedValue({ ok: true, data: { propiaDe: null, conPropia: [] } })
    const respuesta = await pedir(`/configuracion/catalogos/tablas?tabla=${T}&panel=publicar-tabla`)
    expect(respuesta.headers.get('Location')).toBe(
      `/configuracion/origenes/${A}/planilla?panel=tablas&tabla=${T}&accion=publicar-tabla`,
    )
  })

  it('sólo cuenta los orígenes que la persona configura', async () => {
    requerirSesion.mockResolvedValue({ permisos: configura(B) })
    const respuesta = await pedir('/configuracion/catalogos/tablas')
    expect(respuesta.headers.get('Location')).toBe(
      `/configuracion/origenes/${B}/planilla?panel=tablas`,
    )
  })

  it('una tabla que no existe: al drawer del primero, sin la tabla', async () => {
    leerDondeSeUsaLaTabla.mockResolvedValue({ ok: true, data: null })
    const respuesta = await pedir(`/configuracion/catalogos/tablas?tabla=${T}`)
    expect(respuesta.headers.get('Location')).toBe(
      `/configuracion/origenes/${A}/planilla?panel=tablas`,
    )
  })

  it('sin ningún origen que configure: al inicio de Configuración, sin leer la tabla', async () => {
    requerirSesion.mockResolvedValue({ permisos: [] })
    const respuesta = await pedir(`/configuracion/catalogos/tablas?tabla=${T}`)
    expect(respuesta.status).toBe(308)
    expect(respuesta.headers.get('Location')).toBe('/configuracion/inicio')
    expect(leerDondeSeUsaLaTabla).not.toHaveBeenCalled()
  })
})
