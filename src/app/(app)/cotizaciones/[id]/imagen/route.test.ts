// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RUTAS } from '@/shared/lib/rutas'

vi.mock('server-only', () => ({}))

// `requerirSesion()` de verdad, con su lectura de la sesión y su `redirect` simulados: lo que se prueba es que la ruta lo pida antes de leer nada.
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

const leerHuella = vi.fn()
const armar = vi.fn()
const leerAsesor = vi.fn()
// La etiqueta y el ancho son los de verdad (los prueban sus entidades); la E/S, simulada.
vi.mock('@/modules/cotizaciones', async () => {
  const etiqueta = await vi.importActual<{
    etiquetaDeLaImagen: unknown
    coincideLaEtiqueta: unknown
  }>('@/modules/cotizaciones/entities/tarjeta/etiqueta-de-la-imagen')
  const ruta = await vi.importActual<{
    anchoDeLaImagen: unknown
    CLAVE_DEL_ANCHO: unknown
    sinMonedaDeLaImagen: unknown
    CLAVE_SIN_MONEDA: unknown
  }>('@/modules/cotizaciones/entities/ruta-de-la-hoja')
  return {
    etiquetaDeLaImagen: etiqueta.etiquetaDeLaImagen,
    coincideLaEtiqueta: etiqueta.coincideLaEtiqueta,
    anchoDeLaImagen: ruta.anchoDeLaImagen,
    CLAVE_DEL_ANCHO: ruta.CLAVE_DEL_ANCHO,
    sinMonedaDeLaImagen: ruta.sinMonedaDeLaImagen,
    CLAVE_SIN_MONEDA: ruta.CLAVE_SIN_MONEDA,
    leerHuellaDeLaImagen: (id: string) => leerHuella(id),
    armarLaImagen: (id: string, opciones: unknown) => armar(id, opciones),
    leerAsesorQueMira: () => leerAsesor(),
    tituloDeLaCotizacion: () => null,
    tituloAparteDelNumero: () => null,
  }
})
vi.mock('@/shared/lib/almacen', () => ({
  urlPublicaONull: (bucket: string, ruta: string | null) =>
    ruta === null ? null : `https://almacen.test/${bucket}/${ruta}`,
}))
const leerVehiculo = vi.fn()
vi.mock('@/modules/vehiculos', () => ({ leerVehiculo: (id: string) => leerVehiculo(id) }))
const leerCliente = vi.fn()
vi.mock('@/modules/leads', () => ({ leerClienteElegido: (id: string) => leerCliente(id) }))

import { etiquetaDeLaImagen } from '@/modules/cotizaciones'
import { GET } from './route'

const ID = '0b7a2f0e-1c2d-4e5f-8a9b-0c1d2e3f4a5b'
const YO = '00000000-0000-4000-8000-0000000000a1'
const VEHICULO = '00000000-0000-4000-8000-0000000000aa'
const LEAD = '00000000-0000-4000-8000-0000000000cc'
const HUELLA = 'i-0123456789abcdef0123456789abcdef'
const NO_DISPONIBLE = 'Esta cotización ya no está disponible: no existe o ya no tienes acceso.'
const NO_SE_PUDO = 'No se pudo armar la imagen. Vuelve a intentarlo.'
const BYTES = new Uint8Array([82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80])
const ASESOR = {
  nombre: 'Ana Pérez',
  telefono: '+59170000001',
  cargo: 'Asesora',
  foto: `https://almacen.test/avatares/${YO}/a.webp`,
}

const activa = {
  usuarioId: YO,
  estado: 'activa',
  permisos: [],
  perspectiva: { disponible: false, rol: null, roles: [] },
  live: { encendido: false, puedeEncender: true },
}
const hoja = { cotizacion: { id: ID, leadId: LEAD, vehiculoId: VEHICULO } }
const fallo = (codigo: string) => ({ ok: false, error: { codigo, mensaje: 'x' } })
const etiqueta = (ancho: 480 | null = null, sinMoneda = false) =>
  etiquetaDeLaImagen({ huella: HUELLA, usuarioId: YO, ancho, sinMoneda })

// Con qué pidió la ruta armar la imagen: el ancho y lo que devuelve su `contextoDe` con la hoja (el contexto y si se leyó entero). El armado de prueba sale
// `completa` si el contexto se leyó entero.
let pedidoDeArmar: { ancho: unknown; sinMoneda: unknown; contexto: unknown } | null = null

const pedir = (id = ID, cabeceras: Record<string, string> = {}, consulta = '') =>
  GET(
    new Request(`http://localhost/cotizaciones/${id}/imagen${consulta}`, { headers: cabeceras }),
    {
      params: Promise.resolve({ id }),
    },
  )

beforeEach(() => {
  pedidoDeArmar = null
  sesion.mockResolvedValue(activa)
  leerHuella.mockResolvedValue({ ok: true, data: HUELLA })
  armar.mockImplementation(
    async (
      _id: string,
      opciones: {
        ancho: unknown
        sinMoneda?: unknown
        contextoDe: (h: typeof hoja) => Promise<{ completo: boolean }>
      },
    ) => {
      const leido = await opciones.contextoDe(hoja)
      pedidoDeArmar = { ancho: opciones.ancho, sinMoneda: opciones.sinMoneda, contexto: leido }
      return { ok: true, data: { bytes: BYTES, conRecalculo: true, completa: leido.completo } }
    },
  )
  leerAsesor.mockResolvedValue({
    ok: true,
    data: {
      nombre: 'Ana Pérez',
      telefono: '+59170000001',
      cargo: 'Asesora',
      fotoRuta: `${YO}/a.webp`,
    },
  })
  leerVehiculo.mockResolvedValue({
    ok: true,
    data: { titulo: 'Toyota Hilux 2020', lote: '4455', vin: null },
  })
  leerCliente.mockResolvedValue({ ok: true, data: { id: LEAD, nombre: 'Juan Pérez' } })
})
afterEach(() => {
  vi.clearAllMocks()
})

describe('GET /cotizaciones/[id]/imagen: la sesión y lo que no se ve', () => {
  it('sin sesión va al ingreso y no lee nada', async () => {
    sesion.mockResolvedValue(null)
    await expect(pedir()).rejects.toMatchObject({ destino: RUTAS.ingreso })
    expect(leerHuella).not.toHaveBeenCalled()
  })

  it('un guid malo, la huella con 42501 y no_encontrado al armar: el mismo 404 en texto que el PDF', async () => {
    const malo = await pedir('no-es-un-id')
    expect([malo.status, await malo.text()]).toEqual([404, NO_DISPONIBLE])
    expect(leerHuella).not.toHaveBeenCalled()

    leerHuella.mockResolvedValue(fallo('no_encontrado'))
    const oculta = await pedir()
    expect(oculta.status).toBe(404)
    expect(oculta.headers.get('content-type')).toMatch(/^text\/plain/)
    expect(oculta.headers.get('cache-control')).toBe('private, no-store')
    expect(await oculta.text()).toBe(NO_DISPONIBLE)
    expect(armar).not.toHaveBeenCalled()

    leerHuella.mockResolvedValue({ ok: true, data: HUELLA })
    armar.mockResolvedValue(fallo('no_encontrado'))
    expect((await pedir()).status).toBe(404)
    armar.mockResolvedValue(fallo('sin_permiso'))
    expect((await pedir()).status).toBe(404)
  })

  it('un fallo al leer la huella o al armar es 500 en texto, no-store (nunca una vieja)', async () => {
    leerHuella.mockResolvedValue(fallo('inesperado'))
    const sinHuella = await pedir()
    expect([sinHuella.status, await sinHuella.text()]).toEqual([500, NO_SE_PUDO])
    leerHuella.mockResolvedValue({ ok: true, data: HUELLA })
    armar.mockResolvedValue(fallo('inesperado'))
    const r = await pedir()
    expect(r.status).toBe(500)
    expect(r.headers.get('cache-control')).toBe('private, no-store')
    expect(r.headers.get('etag')).toBeNull()
    expect(await r.text()).toBe(NO_SE_PUDO)
  })
})

describe('GET /cotizaciones/[id]/imagen: la ETag', () => {
  it('con If-None-Match igual a la etiqueta (fuerte o débil), 304 sin armar', async () => {
    for (const cabecera of [etiqueta(), `W/${etiqueta()}`]) {
      const r = await pedir(ID, { 'If-None-Match': cabecera })
      expect(r.status).toBe(304)
      expect(r.headers.get('etag')).toBe(etiqueta())
      expect(r.headers.get('cache-control')).toBe('private, no-cache')
      expect(r.headers.get('server-timing')).toMatch(/^huella;dur=/)
    }
    expect(leerHuella).toHaveBeenCalledWith(ID)
    expect(armar).not.toHaveBeenCalled()
  })

  it('sin ella, 200 WebP con su ETag, private, no-cache y Server-Timing', async () => {
    const r = await pedir(ID, { 'If-None-Match': '"vieja"' })
    expect(r.status).toBe(200)
    expect(r.headers.get('content-type')).toBe('image/webp')
    expect(r.headers.get('etag')).toBe(etiqueta())
    expect(r.headers.get('cache-control')).toBe('private, no-cache')
    expect(r.headers.get('x-content-type-options')).toBe('nosniff')
    expect(r.headers.get('server-timing')).toMatch(/^huella;dur=\d+, armar;dur=\d+$/)
    expect(new Uint8Array(await r.arrayBuffer())).toEqual(BYTES)
    expect(pedidoDeArmar?.ancho).toBeNull()
  })

  it('?ancho=480 arma la miniatura con su propia ETag; un ancho que no es de la lista se ignora', async () => {
    const chica = await pedir(ID, {}, '?ancho=480')
    expect([chica.status, chica.headers.get('etag')]).toEqual([200, etiqueta(480)])
    expect(pedidoDeArmar?.ancho).toBe(480)
    expect((await pedir(ID, { 'If-None-Match': etiqueta(480) }, '?ancho=480')).status).toBe(304)
    expect((await pedir(ID, { 'If-None-Match': etiqueta() }, '?ancho=480')).status).toBe(200)
    const rara = await pedir(ID, {}, '?ancho=999&intento=2')
    expect(rara.headers.get('etag')).toBe(etiqueta())
    expect(pedidoDeArmar?.ancho).toBeNull()
  })
})

describe('GET /cotizaciones/[id]/imagen: la variante sin moneda', () => {
  it('?sin-moneda=1 arma la variante del Modo Live con su propia ETag y su 304; otro valor se ignora', async () => {
    const sin = await pedir(ID, {}, '?sin-moneda=1')
    expect([sin.status, sin.headers.get('etag')]).toEqual([200, etiqueta(null, true)])
    expect(etiqueta(null, true)).not.toBe(etiqueta())
    expect(pedidoDeArmar?.sinMoneda).toBe(true)
    expect(
      (await pedir(ID, { 'If-None-Match': etiqueta(null, true) }, '?sin-moneda=1')).status,
    ).toBe(304)
    // La etiqueta de la otra variante nunca da un 304: el navegador no muestra la de con moneda en el Modo Live, ni al revés.
    expect((await pedir(ID, { 'If-None-Match': etiqueta() }, '?sin-moneda=1')).status).toBe(200)
    expect((await pedir(ID, { 'If-None-Match': etiqueta(null, true) })).status).toBe(200)
    const chica = await pedir(ID, {}, '?ancho=480&sin-moneda=1')
    expect(chica.headers.get('etag')).toBe(etiqueta(480, true))
    const rara = await pedir(ID, {}, '?sin-moneda=si')
    expect(rara.headers.get('etag')).toBe(etiqueta())
    expect(pedidoDeArmar?.sinMoneda).toBe(false)
  })
})

describe('GET /cotizaciones/[id]/imagen: sin guardarse', () => {
  it('sin el primer recálculo se entrega con no-store y sin ETag', async () => {
    armar.mockResolvedValue({
      ok: true,
      data: { bytes: BYTES, conRecalculo: false, completa: true },
    })
    const r = await pedir()
    expect(r.status).toBe(200)
    expect(r.headers.get('cache-control')).toBe('private, no-store')
    expect(r.headers.get('etag')).toBeNull()
  })

  it('incompleta (el logo o la foto no llegaron) se entrega con no-store y sin ETag: un fallo de un momento no queda fijo', async () => {
    armar.mockResolvedValue({
      ok: true,
      data: { bytes: BYTES, conRecalculo: true, completa: false },
    })
    const r = await pedir()
    expect(r.status).toBe(200)
    expect(r.headers.get('cache-control')).toBe('private, no-store')
    expect(r.headers.get('etag')).toBeNull()
  })

  it('con «Ver como», no-store sin leer la huella', async () => {
    sesion.mockResolvedValue({
      ...activa,
      perspectiva: {
        disponible: true,
        rol: { id: LEAD, nombre: 'Asesor', color: null },
        roles: [],
      },
    })
    const r = await pedir(ID, { 'If-None-Match': etiqueta() })
    expect(r.status).toBe(200)
    expect(r.headers.get('cache-control')).toBe('private, no-store')
    expect(r.headers.get('etag')).toBeNull()
    expect(leerHuella).not.toHaveBeenCalled()
  })
})

describe('GET /cotizaciones/[id]/imagen: lo que dibuja', () => {
  it('el asesor es quien mira; sin leads.ver, sin el cliente', async () => {
    await pedir()
    expect(pedidoDeArmar?.contexto).toEqual({
      contexto: {
        cliente: null,
        vehiculo: { titulo: 'Toyota Hilux 2020', lote: '4455', vin: null },
        asesor: ASESOR,
      },
      completo: true,
    })
    expect(leerCliente).not.toHaveBeenCalled()
    expect(leerVehiculo).toHaveBeenCalledWith(VEHICULO)
  })

  it('con leads.ver nombra al cliente que ve; si una lectura falla, sale sin ese dato, no-store y sin ETag', async () => {
    sesion.mockResolvedValue({
      ...activa,
      permisos: [{ clave: 'leads.ver', origenId: null, alcance: 'todos' }],
    })
    leerVehiculo.mockResolvedValue(fallo('inesperado'))
    const r = await pedir()
    expect(leerCliente).toHaveBeenCalledWith(LEAD)
    expect(pedidoDeArmar?.contexto).toEqual({
      contexto: { cliente: 'Juan Pérez', vehiculo: null, asesor: ASESOR },
      completo: false,
    })
    expect(r.headers.get('cache-control')).toBe('private, no-store')
    expect(r.headers.get('etag')).toBeNull()
  })

  it('si falla leer al asesor, sale sin él y no queda completa; sin perfil, sí', async () => {
    leerAsesor.mockResolvedValue(fallo('inesperado'))
    const sinLeer = await pedir()
    expect(pedidoDeArmar?.contexto).toMatchObject({ contexto: { asesor: null }, completo: false })
    expect(sinLeer.headers.get('etag')).toBeNull()
    leerAsesor.mockResolvedValue({ ok: true, data: null })
    const sinPerfil = await pedir()
    expect(pedidoDeArmar?.contexto).toMatchObject({ contexto: { asesor: null }, completo: true })
    expect(sinPerfil.headers.get('etag')).toBe(etiqueta())
  })
})
