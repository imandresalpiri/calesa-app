// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RUTAS } from '@/shared/lib/rutas'

vi.mock('server-only', () => ({}))
vi.mock('next/server', () => ({ connection: async () => {} }))

// `requerirSesion()` y el Modo Live de verdad, con su lectura de la sesión y su `redirect` simulados: lo que se prueba es que la ruta los pida
// antes de leer nada.
class Redirigido extends Error {
  constructor(readonly destino: string) {
    super(`redirigido a ${destino}`)
  }
}
const sesion = vi.fn()
vi.mock('@/modules/equipo/composicion', () => ({ leerSesion: () => sesion(), servicioAcceso: {} }))
vi.mock('@/shared/lib/navegacion', () => ({
  redirigir: (destino: string) => {
    throw new Redirigido(destino)
  },
}))

// Las cabeceras y la etiqueta son las de verdad (las prueban sus entidades); la E/S, simulada.
vi.mock('@/modules/artes', async () => vi.importActual<object>('@/modules/artes/entities/medios'))
vi.mock('@/modules/cotizaciones', async () =>
  vi.importActual<object>('@/modules/cotizaciones/entities/tarjeta/etiqueta-de-la-imagen'),
)
const leerVehiculo = vi.fn()
const leerGaleria = vi.fn()
vi.mock('@/modules/vehiculos', () => ({
  leerVehiculo: (id: string) => leerVehiculo(id),
  leerGaleria: (id: string) => leerGaleria(id),
}))
vi.mock('@/shared/lib/almacen', () => ({
  urlPublica: (bucket: string, ruta: string) => `https://almacen.test/${bucket}/${ruta}`,
}))
const bajar = vi.fn()
vi.stubGlobal('fetch', (url: string, opciones: unknown) => bajar(url, opciones))

import { GET } from './route'

const VEHICULO = '00000000-0000-4000-8000-0000000000aa'
const FOTO = '00000000-0000-4000-8000-0000000000f1'
const ORIGEN = '00000000-0000-4000-8000-0000000000b1'
const OTRO_ORIGEN = '00000000-0000-4000-8000-0000000000b2'
const RUTA = `${VEHICULO}/abc123.webp`
const MINIATURA = `${VEHICULO}/abc123-480.webp`
const NO_ESTA = 'Esta foto no existe o ya no tienes acceso.'
const NO_SE_PUDO = 'No se pudo leer la foto.'
const BYTES = new Uint8Array([82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80])

const activa = (live: unknown = { encendido: false, puedeEncender: true }) => ({
  usuarioId: '00000000-0000-4000-8000-0000000000a1',
  estado: 'activa',
  permisos: [],
  perspectiva: { disponible: false, rol: null, roles: [] },
  live,
})
const galeria = (ruta = RUTA, rutaMiniatura = MINIATURA) => ({
  ok: true,
  data: {
    version: null,
    fotos: [
      {
        id: FOTO,
        hash: 'abc123',
        ruta,
        rutaMiniatura,
        ancho: 1600,
        alto: 1200,
        bytes: BYTES.byteLength,
        orden: 1,
        esPortada: true,
      },
    ],
  },
})
const fallo = (codigo: string) => ({ ok: false, error: { codigo, mensaje: 'x' } })

const pedir = (
  { vehiculo = VEHICULO, foto = FOTO }: { vehiculo?: string; foto?: string } = {},
  consulta = '',
  cabeceras: Record<string, string> = {},
) =>
  GET(
    new Request(`http://localhost/artes/fotos/${vehiculo}/${foto}${consulta}`, {
      headers: cabeceras,
    }),
    { params: Promise.resolve({ vehiculo, foto }) },
  )

beforeEach(() => {
  sesion.mockResolvedValue(activa())
  leerVehiculo.mockResolvedValue({ ok: true, data: { id: VEHICULO, origenId: ORIGEN } })
  leerGaleria.mockResolvedValue(galeria())
  bajar.mockImplementation(() => Promise.resolve(new Response(BYTES, { status: 200 })))
})
afterEach(() => {
  vi.clearAllMocks()
})

describe('GET /artes/fotos/[vehiculo]/[foto]: la sesión y lo que no se ve', () => {
  it('sin sesión va al ingreso y no lee nada', async () => {
    sesion.mockResolvedValue(null)
    await expect(pedir()).rejects.toMatchObject({ destino: RUTAS.ingreso })
    expect(leerGaleria).not.toHaveBeenCalled()
    expect(bajar).not.toHaveBeenCalled()
  })

  it('un id malo, un vehículo que no se ve, una foto que no es suya o un origen que el Live esconde: el mismo 404 en texto', async () => {
    const malo = await pedir({ foto: 'no-es-un-id' })
    expect([malo.status, await malo.text()]).toEqual([404, NO_ESTA])
    expect(leerGaleria).not.toHaveBeenCalled()

    leerVehiculo.mockResolvedValue({ ok: true, data: null })
    const oculto = await pedir()
    expect(oculto.status).toBe(404)
    expect(oculto.headers.get('content-type')).toMatch(/^text\/plain/)
    expect(oculto.headers.get('cache-control')).toBe('private, no-store')

    leerVehiculo.mockResolvedValue({ ok: true, data: { id: VEHICULO, origenId: ORIGEN } })
    expect((await pedir({ foto: '00000000-0000-4000-8000-0000000000f9' })).status).toBe(404)

    sesion.mockResolvedValue(
      activa({
        encendido: true,
        puedeEncender: true,
        nombresDeClientes: false,
        ajustes: { cotizaciones: true, origenes: [OTRO_ORIGEN] },
      }),
    )
    expect((await pedir()).status).toBe(404)
    expect(bajar).not.toHaveBeenCalled()
  })

  it('con el Live escondiendo las cotizaciones, 404 sin leer nada', async () => {
    sesion.mockResolvedValue(
      activa({
        encendido: true,
        puedeEncender: true,
        nombresDeClientes: false,
        ajustes: { cotizaciones: false, origenes: 'todos' },
      }),
    )
    expect((await pedir()).status).toBe(404)
    expect(leerVehiculo).not.toHaveBeenCalled()
  })
})

describe('GET /artes/fotos/[vehiculo]/[foto]: el archivo', () => {
  it('sin ancho u otro ancho que 480, la de 1.600 px; con 480, la miniatura; inmutable, con su ETag', async () => {
    const completa = await pedir()
    expect(completa.status).toBe(200)
    expect(new Uint8Array(await completa.arrayBuffer())).toEqual(BYTES)
    expect(completa.headers.get('content-type')).toBe('image/webp')
    expect(completa.headers.get('cache-control')).toBe('private, max-age=86400, immutable')
    expect(completa.headers.get('etag')).toBe(`"${RUTA}"`)
    expect(bajar).toHaveBeenLastCalledWith(
      `https://almacen.test/vehiculos/${RUTA}`,
      expect.objectContaining({ cache: 'no-store' }),
    )

    expect((await pedir({}, '?ancho=999')).headers.get('etag')).toBe(`"${RUTA}"`)
    expect(bajar).toHaveBeenLastCalledWith(
      `https://almacen.test/vehiculos/${RUTA}`,
      expect.anything(),
    )

    const chica = await pedir({}, '?ancho=480')
    expect(chica.headers.get('etag')).toBe(`"${MINIATURA}"`)
    expect(bajar).toHaveBeenLastCalledWith(
      `https://almacen.test/vehiculos/${MINIATURA}`,
      expect.anything(),
    )
  })

  it('con la ETag que ya tiene, 304 sin bajar nada (después de ver que la ve)', async () => {
    const r = await pedir({}, '', { 'if-none-match': `"${RUTA}"` })
    expect(r.status).toBe(304)
    expect(r.headers.get('etag')).toBe(`"${RUTA}"`)
    expect(leerGaleria).toHaveBeenCalledWith(VEHICULO)
    expect(bajar).not.toHaveBeenCalled()
  })

  it('una ruta que no es de una foto o un objeto que el bucket no tiene: 404; un fallo de lectura o del bucket: 500', async () => {
    leerGaleria.mockResolvedValue(galeria(`${VEHICULO}/abc123.svg`))
    expect((await pedir()).status).toBe(404)

    leerGaleria.mockResolvedValue(galeria())
    bajar.mockResolvedValue(new Response('no', { status: 400 }))
    expect((await pedir()).status).toBe(404)

    bajar.mockRejectedValue(new Error('sin red'))
    const sinRed = await pedir()
    expect([sinRed.status, await sinRed.text()]).toEqual([500, NO_SE_PUDO])

    leerGaleria.mockResolvedValue(fallo('inesperado'))
    const sinGaleria = await pedir()
    expect(sinGaleria.status).toBe(500)
    expect(sinGaleria.headers.get('cache-control')).toBe('private, no-store')
  })
})
