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

const leerHoja = vi.fn()
const leerAsesor = vi.fn()
const pdf = vi.fn()
// `contextoDeLaPagina()` devuelve lo que recibe: lo que se prueba es qué le pasa la ruta (el formato lo prueba su entidad).
vi.mock('@/modules/cotizaciones', () => ({
  leerHojaDeUnaGuardada: (id: string) => leerHoja(id),
  leerAsesorQueMira: () => leerAsesor(),
  pdfDeUnaGuardada: (entrada: unknown) => pdf(entrada),
  contextoDeLaPagina: (pagina: unknown, opciones: unknown) => ({ pagina, opciones }),
  // La regla del título que se muestra, en corto (la prueba de verdad es la de `entities/`): el título, el vehículo o el número; junto al número, sin el número.
  tituloDeLaCotizacion: (t: { titulo: string | null; vehiculo: string | null; numero: number }) =>
    t.titulo !== null
      ? { texto: t.titulo, fuente: 'titulo' }
      : t.vehiculo !== null
        ? { texto: t.vehiculo, fuente: 'vehiculo' }
        : { texto: `Cotización n.º ${String(t.numero)}`, fuente: 'numero' },
  tituloAparteDelNumero: (t: { texto: string; fuente: string } | null) =>
    t === null || t.fuente === 'numero' ? null : t.texto,
}))
const leerVehiculo = vi.fn()
vi.mock('@/modules/vehiculos', () => ({ leerVehiculo: (id: string) => leerVehiculo(id) }))
const leerCliente = vi.fn()
vi.mock('@/modules/leads', () => ({ leerClienteElegido: (id: string) => leerCliente(id) }))
const leerAjustes = vi.fn()
vi.mock('@/modules/empresa', () => ({
  leerAjustes: () => leerAjustes(),
  PESO_MAXIMO_LOGO: 1048576,
}))
vi.mock('@/shared/lib/almacen', () => ({
  urlPublicaONull: (bucket: string, ruta: string | null) =>
    ruta === null ? null : `https://almacen.test/${bucket}/${ruta}`,
}))

import { GET } from './route'

const ID = '0b7a2f0e-1c2d-4e5f-8a9b-0c1d2e3f4a5b'
const VEHICULO = '00000000-0000-4000-8000-0000000000aa'
const LEAD = '00000000-0000-4000-8000-0000000000cc'
// El último guardado, a las 22:30 del 6 de noviembre en La Paz (el 7 en UTC).
const GUARDADA_EL = '2026-11-07T02:30:00.123456+00:00'
const NO_DISPONIBLE = 'Esta cotización ya no está disponible: no existe o ya no tienes acceso.'
const NO_SE_PUDO = 'No se pudo armar el PDF. Vuelve a intentarlo.'

const activa = {
  usuarioId: ID,
  estado: 'activa',
  permisos: [],
  live: { encendido: false, puedeEncender: true },
}
const hoja = {
  cotizacion: {
    id: ID,
    numero: 12,
    titulo: 'Hilux para Juan',
    actualizadoEn: GUARDADA_EL,
    vehiculoId: VEHICULO,
    leadId: LEAD,
  },
  vencida: true,
  venceEl: '2026-11-20',
}
const inicial = { respuesta: null, estado: { tipo: 'al_dia' } }
const ajustes = {
  nombre: 'Importadora Prueba',
  logoRuta: 'logos/abc.png',
  locale: 'en-US',
  zonaHoraria: 'America/La_Paz',
}
const BYTES = new TextEncoder().encode('%PDF-1.3 prueba')

const pedir = (id = ID) =>
  GET(new Request(`http://localhost/cotizaciones/${id}/pdf`), { params: Promise.resolve({ id }) })
const fallo = (codigo: string) => ({ ok: false, error: { codigo, mensaje: 'x' } })

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-12-25T15:00:00Z'))
  sesion.mockResolvedValue(activa)
  leerHoja.mockResolvedValue({ ok: true, data: { hoja, inicial } })
  leerAsesor.mockResolvedValue({
    ok: true,
    data: { nombre: 'Ana Pérez', telefono: '+59170000001', cargo: 'Asesora', fotoRuta: null },
  })
  leerVehiculo.mockResolvedValue({
    ok: true,
    data: { titulo: 'Toyota Hilux 2020', lote: '4455', vin: null },
  })
  leerCliente.mockResolvedValue({ ok: true, data: { id: LEAD, nombre: 'Juan Pérez' } })
  leerAjustes.mockResolvedValue({ ok: true, data: { ajustes, conDatosCargados: true } })
  pdf.mockResolvedValue({ ok: true, data: { bytes: BYTES, archivo: 'cotizacion-12.pdf' } })
})
afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('GET /cotizaciones/[id]/pdf: la sesión y lo que no se ve', () => {
  it('sin sesión va al ingreso y no lee nada', async () => {
    sesion.mockResolvedValue(null)
    await expect(pedir()).rejects.toMatchObject({ destino: RUTAS.ingreso })
    expect(leerHoja).not.toHaveBeenCalled()
  })

  it('con la cuenta dada de baja va a cerrar la sesión y no lee nada', async () => {
    sesion.mockResolvedValue({ ...activa, estado: 'baja' })
    await expect(pedir()).rejects.toMatchObject({ destino: RUTAS.cierre })
    expect(leerHoja).not.toHaveBeenCalled()
  })

  it('un id que no es un guid es 404 y no lee la hoja', async () => {
    const r = await pedir('no-es-un-id')
    expect(r.status).toBe(404)
    expect(await r.text()).toBe(NO_DISPONIBLE)
    expect(leerHoja).not.toHaveBeenCalled()
  })

  it('lo que no existe, está en la papelera o no se ve es 404 con el texto de la página, nunca 403', async () => {
    leerHoja.mockResolvedValue(fallo('sin_permiso'))
    const r = await pedir()
    expect(r.status).toBe(404)
    expect(r.headers.get('content-type')).toMatch(/^text\/plain/)
    expect(await r.text()).toBe(NO_DISPONIBLE)
  })

  it('la tarjeta que no se ve también es 404; otro fallo del PDF es 500', async () => {
    pdf.mockResolvedValue(fallo('sin_permiso'))
    expect((await pedir()).status).toBe(404)
    pdf.mockResolvedValue(fallo('inesperado'))
    const r = await pedir()
    expect(r.status).toBe(500)
    expect(await r.text()).toBe(NO_SE_PUDO)
  })

  it('un error al leer la hoja es 500', async () => {
    leerHoja.mockResolvedValue(fallo('inesperado'))
    const r = await pedir()
    expect(r.status).toBe(500)
    expect(await r.text()).toBe(NO_SE_PUDO)
  })

  it('si no se leen los ajustes es 500: el PDF no sale con el formato de fábrica', async () => {
    leerAjustes.mockResolvedValue(fallo('inesperado'))
    expect((await pedir()).status).toBe(500)
    expect(pdf).not.toHaveBeenCalled()
  })
})

describe('GET /cotizaciones/[id]/pdf: el PDF', () => {
  it('200 con el PDF y sus cuatro cabeceras', async () => {
    const r = await pedir()
    expect(r.status).toBe(200)
    expect(r.headers.get('content-type')).toBe('application/pdf')
    expect(r.headers.get('content-disposition')).toBe('attachment; filename="cotizacion-12.pdf"')
    expect(r.headers.get('cache-control')).toBe('private, no-store')
    expect(r.headers.get('x-content-type-options')).toBe('nosniff')
    expect(new Uint8Array(await r.arrayBuffer())).toEqual(BYTES)
  })

  it('arma el contexto: el título, el vehículo con lote y VIN, el asesor, el vencimiento, la empresa, el logo y las fechas en la zona de la empresa (el último guardado, no hoy)', async () => {
    await pedir()
    expect(leerHoja).toHaveBeenCalledWith(ID)
    expect(leerAsesor).toHaveBeenCalled()
    expect(leerVehiculo).toHaveBeenCalledWith(VEHICULO)
    expect(pdf).toHaveBeenCalledWith({
      lectura: { hoja, inicial },
      contexto: {
        pagina: {
          titulo: 'Hilux para Juan',
          // Sin `leads.ver`, el cliente no se lee ni se nombra.
          cliente: null,
          vehiculo: { titulo: 'Toyota Hilux 2020', lote: '4455', vin: null },
          asesor: { nombre: 'Ana Pérez', telefono: '+59170000001', cargo: 'Asesora', foto: null },
          numero: 12,
          empresa: 'Importadora Prueba',
          venceEl: '2026-11-20',
          guardadaEl: GUARDADA_EL,
          logo: { nombre: 'Importadora Prueba', url: 'https://almacen.test/marca/logos/abc.png' },
        },
        opciones: { zona: 'America/La_Paz', hoy: GUARDADA_EL },
      },
      locale: 'en-US',
      empresa: 'Importadora Prueba',
      topeDelLogo: 1048576,
    })
    expect(leerCliente).not.toHaveBeenCalled()
  })

  it('el cliente se nombra sólo con `leads.ver`', async () => {
    sesion.mockResolvedValue({
      ...activa,
      permisos: [{ clave: 'leads.ver', origenId: null, alcance: 'todos' }],
    })
    await pedir()
    expect(leerCliente).toHaveBeenCalledWith(LEAD)
    expect(pdf).toHaveBeenCalledWith(
      expect.objectContaining({
        contexto: expect.objectContaining({
          pagina: expect.objectContaining({ cliente: 'Juan Pérez' }),
        }),
      }),
    )
  })

  it('si falla la lectura del vehículo o del asesor, el PDF sale sin ese dato', async () => {
    leerVehiculo.mockResolvedValue(fallo('inesperado'))
    leerAsesor.mockResolvedValue(fallo('inesperado'))
    leerAjustes.mockResolvedValue({
      ok: true,
      data: { ajustes: { ...ajustes, logoRuta: null }, conDatosCargados: true },
    })
    const r = await pedir()
    expect(r.status).toBe(200)
    expect(pdf).toHaveBeenCalledWith(
      expect.objectContaining({
        contexto: expect.objectContaining({
          pagina: expect.objectContaining({ vehiculo: null, asesor: null, logo: null }),
        }),
      }),
    )
  })
})

describe('GET /cotizaciones/[id]/pdf: el título de la cotización', () => {
  it('sin título propio, el del vehículo; sin vehículo tampoco, ninguno (el número ya está en su celda)', async () => {
    leerHoja.mockResolvedValue({
      ok: true,
      data: { hoja: { ...hoja, cotizacion: { ...hoja.cotizacion, titulo: null } }, inicial },
    })
    await pedir()
    expect(pdf).toHaveBeenLastCalledWith(
      expect.objectContaining({
        contexto: expect.objectContaining({
          pagina: expect.objectContaining({ titulo: 'Toyota Hilux 2020' }),
        }),
      }),
    )
    leerVehiculo.mockResolvedValue(fallo('inesperado'))
    await pedir()
    expect(pdf).toHaveBeenLastCalledWith(
      expect.objectContaining({
        contexto: expect.objectContaining({ pagina: expect.objectContaining({ titulo: null }) }),
      }),
    )
  })
})
