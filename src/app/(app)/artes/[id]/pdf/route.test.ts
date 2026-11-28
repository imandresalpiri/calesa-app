// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DatosDelArte, PedidoDelPdfDelArte } from '@/modules/artes'
import { RUTAS } from '@/shared/lib/rutas'

vi.mock('server-only', () => ({}))

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

// Lo puro de `artes` es el de verdad (el documento, el pedido, cómo se resuelve cada página); la plantilla y el dibujo, simulados.
const leerPlantilla = vi.fn()
const dibujar = vi.fn()
vi.mock('@/modules/artes', async () => ({
  ...(await vi.importActual<object>('@/modules/artes/entities/medios')),
  ...(await vi.importActual<object>('@/modules/artes/entities/documento')),
  ...(await vi.importActual<object>('@/modules/artes/entities/formatos')),
  ...(await vi.importActual<object>('@/modules/artes/entities/editor/exportar')),
  ...(await vi.importActual<object>('@/modules/artes/entities/pdf/pedido-del-pdf')),
  ...(await vi.importActual<object>('@/modules/artes/entities/pdf/tope-del-pdf')),
  ...(await vi.importActual<object>('@/modules/artes/entities/pdf/paginas-con-datos')),
  ...(await vi.importActual<object>('@/modules/artes/entities/datos/valores-del-arte')),
  leerPlantillaParaEditar: (id: string) => leerPlantilla(id),
  pdfDelArte: (pedido: PedidoDelPdfDelArte) => dibujar(pedido),
}))
// Lo que se vuelve a leer con la sesión: los datos del elegido y las imágenes (sus lectores se prueban en `_arte/pdf/`).
const leerDatos = vi.fn()
const leerImagenes = vi.fn()
vi.mock('../../../_arte/pdf/datos-para-el-pdf', () => ({
  leerDatosParaElPdf: (...args: unknown[]) => leerDatos(...args),
}))
vi.mock('../../../_arte/pdf/imagenes-para-el-pdf', () => ({
  imagenesParaElPdf: (...args: unknown[]) => leerImagenes(...args),
}))

import { MENSAJE_DEMASIADAS_LINEAS } from '@/modules/artes'
import { POST } from './route'

const ID = '00000000-0000-4000-8000-0000000000a7'
const ORIGEN = '00000000-0000-4000-8000-0000000000b1'
const VEHICULO = '00000000-0000-4000-8000-0000000000c1'
const COTIZACION = '00000000-0000-4000-8000-0000000000d1'
const NO_ESTA = 'No encontramos esta plantilla de arte.'
const NO_SE_PUDO = 'No se pudo armar el PDF. Vuelve a intentarlo.'
const INVALIDO = 'La plantilla de arte no es válida.'
const PESADO = 'La plantilla de arte pesa más de 512 KB.'
const BYTES = new Uint8Array([37, 80, 68, 70])

const activa = (live: unknown = { encendido: false, puedeEncender: true }) => ({
  usuarioId: '00000000-0000-4000-8000-0000000000a1',
  estado: 'activa',
  permisos: [],
  perspectiva: { disponible: false, rol: null, roles: [] },
  live,
})
const LIVE_SIN_MONEDA = {
  encendido: true,
  puedeEncender: true,
  nombresDeClientes: false,
  ajustes: { cotizaciones: true, origenes: 'todos' },
}

const TOTAL = {
  id: 't',
  tipo: 'texto',
  nombre: null,
  grupoId: null,
  x: 40,
  y: 40,
  ancho: 400,
  alto: 60,
  rotacion: 0,
  opacidad: 1,
  bloqueada: false,
  oculta: false,
  sombra: null,
  texto: 'Total: {total}',
  fuente: 'Geist',
  tamano: 24,
  peso: 400,
  interlineado: 1.2,
  color: '#111111',
  alineacion: 'izquierda',
  borde: null,
  grosor: 0,
}
const DOCUMENTO = {
  version: 3,
  paginas: [
    { id: 'p1', fondo: { tipo: 'color', color: '#ffffff' }, capas: [TOTAL], grupos: [] },
    { id: 'p2', fondo: { tipo: 'color', color: '#ffffff' }, capas: [], grupos: [] },
  ],
}
const ELECCION = { vehiculoId: VEHICULO, cotizacionId: COTIZACION, leadId: null }

const plantilla = (formato = 'a4') => ({
  ok: true,
  data: {
    id: ID,
    nombre: 'Ficha Hilux',
    formato,
    ancho: 595,
    alto: 842,
    origenId: ORIGEN,
    visibilidad: 'privada',
    autorId: '00000000-0000-4000-8000-0000000000a1',
    actualizadoEn: '2026-11-28T10:00:00.000000+00:00',
    documento: { ok: true, data: DOCUMENTO },
  },
})

const DATOS: DatosDelArte = {
  deEjemplo: false,
  vehiculo: null,
  cotizacion: {
    id: COTIZACION,
    numero: 128,
    total: { conMoneda: 'USD 21.300,00', sinMoneda: '21.300,00' },
    modo: null,
    venceEl: null,
    celdas: {},
    imagen: {
      src: `/cotizaciones/${COTIZACION}/imagen`,
      srcSinMoneda: `/cotizaciones/${COTIZACION}/imagen?sin-moneda=1`,
    },
  },
  lead: null,
  asesor: null,
  empresa: {
    nombre: 'Calesa Motors',
    web: null,
    redes: {},
    zona: 'America/La_Paz',
    locale: 'es-BO',
  },
}
const leidos = {
  datos: DATOS,
  catalogo: { tipo: 'manual', campos: [] },
  logos: [],
  deDonde: { vehiculoId: VEHICULO, fotos: [], cotizacionId: COTIZACION, logos: [] },
}

const pedir = (
  cuerpo: unknown = { documento: DOCUMENTO, eleccion: ELECCION },
  { id = ID, cabeceras = { 'sec-fetch-site': 'same-origin' } as Record<string, string> } = {},
) =>
  POST(
    new Request(`http://localhost/artes/${id}/pdf`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...cabeceras },
      body: typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo),
    }),
    { params: Promise.resolve({ id }) },
  )

const enTexto = async (r: Response) => [r.status, await r.text()]

beforeEach(() => {
  sesion.mockResolvedValue(activa())
  leerPlantilla.mockResolvedValue(plantilla())
  leerDatos.mockResolvedValue({ ok: true, data: leidos })
  leerImagenes.mockResolvedValue(new Map())
  dibujar.mockResolvedValue({ ok: true, data: { bytes: BYTES, faltan: 2 } })
})
afterEach(() => {
  vi.clearAllMocks()
})

describe('POST /artes/[id]/pdf: quién y desde dónde', () => {
  it('sin sesión va al ingreso y no lee nada', async () => {
    sesion.mockResolvedValue(null)
    await expect(pedir()).rejects.toMatchObject({ destino: RUTAS.ingreso })
    expect(leerPlantilla).not.toHaveBeenCalled()
  })

  it('desde otro sitio, 403 sin leer nada; sin Sec-Fetch-Site vale un Origin igual al host', async () => {
    const ajeno = await pedir(undefined, { cabeceras: { 'sec-fetch-site': 'cross-site' } })
    expect(ajeno.status).toBe(403)
    expect((await pedir(undefined, { cabeceras: {} })).status).toBe(403)
    expect(leerPlantilla).not.toHaveBeenCalled()
    const viejo = await pedir(undefined, {
      cabeceras: { origin: 'http://localhost:3000', host: 'localhost:3000' },
    })
    expect(viejo.status).toBe(200)
  })

  it('un id malo, el Live que esconde Artes, una plantilla que no se ve o que no es de PDF: el mismo 404 en texto', async () => {
    expect(await enTexto(await pedir(undefined, { id: 'no-es-un-id' }))).toEqual([404, NO_ESTA])
    sesion.mockResolvedValue(
      activa({ ...LIVE_SIN_MONEDA, ajustes: { cotizaciones: false, origenes: 'todos' } }),
    )
    expect((await pedir()).status).toBe(404)
    expect(leerPlantilla).not.toHaveBeenCalled()

    sesion.mockResolvedValue(activa())
    leerPlantilla.mockResolvedValue({ ok: true, data: null })
    const oculta = await pedir()
    expect(await enTexto(oculta)).toEqual([404, NO_ESTA])
    expect(oculta.headers.get('cache-control')).toBe('private, no-store')
    leerPlantilla.mockResolvedValue(plantilla('cuadrado'))
    expect((await pedir()).status).toBe(404)
    expect(leerDatos).not.toHaveBeenCalled()
  })
})

describe('POST /artes/[id]/pdf: el cuerpo', () => {
  it('más pesado que su tope, 413 sin leer la plantilla', async () => {
    const pesado = await pedir({
      documento: DOCUMENTO,
      eleccion: null,
      relleno: 'x'.repeat(620_000),
    })
    expect(await enTexto(pesado)).toEqual([413, PESADO])
    expect(leerPlantilla).not.toHaveBeenCalled()
  })

  it('un JSON roto, sin la elección, con ids que no son guid o un documento inválido: 422', async () => {
    for (const cuerpo of [
      '{',
      { documento: DOCUMENTO },
      { documento: DOCUMENTO, eleccion: { ...ELECCION, vehiculoId: 'x' } },
      { documento: { version: 3, paginas: [] }, eleccion: null },
    ]) {
      expect(await enTexto(await pedir(cuerpo))).toEqual([422, INVALIDO])
    }
    expect(leerPlantilla).not.toHaveBeenCalled()
  })
})

describe('POST /artes/[id]/pdf: el PDF', () => {
  it('vuelve a leer lo elegido con la sesión y la plantilla, y sale adjunto con lo que faltó', async () => {
    const r = await pedir({ documento: DOCUMENTO, eleccion: ELECCION, datos: { lead: 'Otro' } })
    expect(r.status).toBe(200)
    expect(new Uint8Array(await r.arrayBuffer())).toEqual(BYTES)
    expect(r.headers.get('content-type')).toBe('application/pdf')
    expect(r.headers.get('content-disposition')).toBe('attachment; filename="ficha-hilux.pdf"')
    expect(r.headers.get('x-imagenes-que-faltan')).toBe('2')
    expect(r.headers.get('cache-control')).toBe('private, no-store')
    expect(leerDatos).toHaveBeenCalledWith(
      expect.objectContaining({ usuarioId: activa().usuarioId }),
      {
        origenId: ORIGEN,
        eleccion: ELECCION,
      },
    )
    const [pedido] = dibujar.mock.calls[0] as [PedidoDelPdfDelArte]
    expect(pedido.medidas).toEqual({ ancho: 595, alto: 842 })
    expect(pedido.titulo).toBe('Ficha Hilux')
    expect(pedido.autor).toBe('Calesa Motors')
    expect(pedido.paginas.map((p) => p.pagina.id)).toEqual(['p1', 'p2'])
  })

  it('los montos van con su moneda aunque el Live esté encendido', async () => {
    sesion.mockResolvedValue(activa(LIVE_SIN_MONEDA))
    expect((await pedir()).status).toBe(200)
    const [pedido] = dibujar.mock.calls[0] as [PedidoDelPdfDelArte]
    expect(pedido.paginas[0]?.conDatos.resueltas.get('t')).toEqual({
      tipo: 'texto',
      texto: 'Total: USD 21.300,00',
    })
  })

  it('el vehículo elegido que ya no se ve, 404 con su texto; un fallo al leer o al dibujar, 500', async () => {
    leerDatos.mockResolvedValue({ ok: true, data: null })
    expect(await enTexto(await pedir())).toEqual([
      404,
      'Este vehículo no existe o ya no tienes acceso.',
    ])
    leerDatos.mockResolvedValue({ ok: false, error: { codigo: 'inesperado', mensaje: 'x' } })
    expect(await enTexto(await pedir())).toEqual([500, NO_SE_PUDO])
    leerDatos.mockResolvedValue({ ok: true, data: leidos })
    dibujar.mockRejectedValue(new Error('react-pdf'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(await enTexto(await pedir())).toEqual([500, NO_SE_PUDO])
  })

  it('una página que pasa su tope de líneas, 422 con el texto que lo dice; otra regla al leer, 500', async () => {
    dibujar.mockResolvedValue({
      ok: false,
      error: { codigo: 'regla', mensaje: MENSAJE_DEMASIADAS_LINEAS },
    })
    expect(await enTexto(await pedir())).toEqual([422, MENSAJE_DEMASIADAS_LINEAS])
    leerDatos.mockResolvedValue({ ok: false, error: { codigo: 'regla', mensaje: 'x' } })
    expect(await enTexto(await pedir())).toEqual([500, NO_SE_PUDO])
  })
})
