// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const sesion = vi.fn()
vi.mock('@/modules/equipo/composicion', () => ({ leerSesion: () => sesion(), servicioAcceso: {} }))
vi.mock('@/shared/lib/navegacion', () => ({
  redirigir: (destino: string) => {
    throw new Error(`redirigido a ${destino}`)
  },
}))

const leerHoja = vi.fn()
const leerAutor = vi.fn()
const leerAsesor = vi.fn()
const cifras = vi.fn()
vi.mock('@/modules/cotizaciones', () => ({
  leerHojaDeUnaGuardada: (id: string) => leerHoja(id),
  leerAutorDeLaCotizacion: (id: string) => leerAutor(id),
  leerAsesorQueMira: () => leerAsesor(),
  paraCompartirDeUnaGuardada: (entrada: unknown) => cifras(entrada),
  contextoDeLaPagina: (pagina: unknown) => pagina,
  enlaceParaCompartir: (t: string | null) => (t?.startsWith('https://') ? t : null),
  tituloDeLaCotizacion: (t: { titulo: string | null; vehiculo: string | null; numero: number }) =>
    t.titulo !== null
      ? { texto: t.titulo, fuente: 'titulo' }
      : t.vehiculo !== null
        ? { texto: t.vehiculo, fuente: 'vehiculo' }
        : { texto: `Cotización n.º ${String(t.numero)}`, fuente: 'numero' },
  tituloAparteDelNumero: () => null,
}))
const leerVehiculo = vi.fn()
const leerSubasta = vi.fn()
vi.mock('@/modules/vehiculos', () => ({
  leerVehiculo: (id: string) => leerVehiculo(id),
  leerSubasta: (id: string) => leerSubasta(id),
  zonaDelPatioDe: (v: { atributos: Record<string, unknown> }) =>
    v.atributos['ubicacion_estado'] === 'TX' ? 'America/Chicago' : null,
}))
vi.mock('@/modules/leads', () => ({ leerClienteElegido: vi.fn() }))
const leerAjustes = vi.fn()
vi.mock('@/modules/empresa', () => ({ leerAjustes: () => leerAjustes() }))
vi.mock('@/shared/lib/almacen', () => ({
  urlPublicaONull: (bucket: string, ruta: string | null) =>
    ruta === null ? null : `https://almacen.test/${bucket}/${ruta}`,
}))

import { GET } from './route'

const ID = '0b7a2f0e-1c2d-4e5f-8a9b-0c1d2e3f4a5b'
const VEHICULO = '00000000-0000-4000-8000-0000000000aa'
const NO_DISPONIBLE = 'Esta cotización ya no está disponible: no existe o ya no tienes acceso.'

const hoja = {
  cotizacion: {
    id: ID,
    numero: 12,
    titulo: null,
    actualizadoEn: '2026-11-07T02:30:00.123456+00:00',
    vehiculoId: VEHICULO,
    leadId: null,
  },
  venceEl: '2026-11-20',
}
const vehiculo = {
  id: VEHICULO,
  titulo: 'Toyota Hilux 2022',
  lote: '4455',
  anio: 2022,
  kilometraje: 45000,
  vin: null,
  urlOrigen: 'https://www.copart.com/lot/4455',
  portadaRuta: 'v/1-m.webp',
  atributos: { ubicacion_estado: 'TX' },
}
const LINEAS = {
  conceptos: [
    {
      concepto: 'Remate',
      monto: '$ 1.000,00',
      segunda: null,
      montoSinMoneda: '1.000,00',
      segundaSinMoneda: null,
    },
  ],
  total: {
    concepto: 'Total',
    monto: '$ 1.300,00',
    segunda: null,
    montoSinMoneda: '1.300,00',
    segundaSinMoneda: null,
  },
  modo: 'Oficial',
}
// Quien comparte: Luis, aunque la creó Ana.
const LUIS = {
  nombre: 'Luis Rojas',
  telefono: '+59170000002',
  cargo: 'Asesor comercial',
  fotoRuta: 'u/luis.webp',
}
const pedir = (id = ID) =>
  GET(new Request(`http://localhost/cotizaciones/${id}/compartir`), {
    params: Promise.resolve({ id }),
  })
const fallo = (codigo: string) => ({ ok: false, error: { codigo, mensaje: 'x' } })

beforeEach(() => {
  sesion.mockResolvedValue({ usuarioId: ID, estado: 'activa', permisos: [] })
  leerHoja.mockResolvedValue({ ok: true, data: { hoja, inicial: {} } })
  leerAutor.mockResolvedValue({ ok: true, data: 'Ana Pérez' })
  leerAsesor.mockResolvedValue({ ok: true, data: LUIS })
  leerVehiculo.mockResolvedValue({ ok: true, data: vehiculo })
  leerSubasta.mockResolvedValue({
    ok: true,
    data: { subastaEn: '2026-11-19T15:00:00+00:00', subastaFinEn: '2026-11-20T04:00:00+00:00' },
  })
  leerAjustes.mockResolvedValue({
    ok: true,
    data: { ajustes: { locale: 'es-BO', zonaHoraria: 'America/La_Paz' } },
  })
  cifras.mockResolvedValue({ ok: true, data: LINEAS })
})
afterEach(() => {
  vi.clearAllMocks()
})

describe('GET /cotizaciones/[id]/compartir', () => {
  it('sin sesión no lee nada', async () => {
    sesion.mockResolvedValue(null)
    await expect(pedir()).rejects.toThrow('redirigido')
    expect(leerHoja).not.toHaveBeenCalled()
  })

  it('un id que no es guid o una cotización que no se ve es el 404 del PDF', async () => {
    const malo = await pedir('no-es-un-id')
    expect(malo.status).toBe(404)
    expect(await malo.text()).toBe(NO_DISPONIBLE)
    leerHoja.mockResolvedValue(fallo('sin_permiso'))
    expect((await pedir()).status).toBe(404)
    cifras.mockResolvedValue(fallo('sin_permiso'))
    leerHoja.mockResolvedValue({ ok: true, data: { hoja, inicial: {} } })
    expect((await pedir()).status).toBe(404)
  })

  it('con el vehículo: su título, el cierre de la subasta, la zona del patio y las cifras de la tarjeta', async () => {
    const r = await pedir()
    expect(r.status).toBe(200)
    expect(r.headers.get('cache-control')).toBe('private, no-store')
    expect(await r.json()).toEqual({
      numero: 12,
      titulo: { texto: 'Toyota Hilux 2022', fuente: 'vehiculo' },
      autor: 'Ana Pérez',
      asesor: { nombre: 'Luis Rojas', cargo: 'Asesor comercial', telefono: '+59170000002' },
      vehiculo: {
        titulo: 'Toyota Hilux 2022',
        lote: '4455',
        anio: 2022,
        kilometraje: 45000,
        vin: null,
        enlace: 'https://www.copart.com/lot/4455',
        cierre: '2026-11-20T04:00:00.000Z',
        zonaDelPatio: 'America/Chicago',
        hayFotos: true,
      },
      ...LINEAS,
      zonaDeLaEmpresa: 'America/La_Paz',
      locale: 'es-BO',
    })
    // Las cifras salen de la tarjeta de lo guardado, con el locale de la empresa, sin el cliente y con quien comparte de asesor.
    expect(cifras).toHaveBeenCalledWith(
      expect.objectContaining({
        locale: 'es-BO',
        contexto: expect.objectContaining({
          cliente: null,
          asesor: {
            nombre: 'Luis Rojas',
            telefono: '+59170000002',
            cargo: 'Asesor comercial',
            foto: 'https://almacen.test/avatares/u/luis.webp',
          },
        }),
      }),
    )
  })

  it('un autor o un asesor que no se leen no tumban nada: van sin nombrar', async () => {
    leerAutor.mockResolvedValue(fallo('inesperado'))
    leerAsesor.mockResolvedValue(fallo('inesperado'))
    const datos = (await (await pedir()).json()) as { autor: unknown; asesor: unknown }
    expect(datos.autor).toBeNull()
    expect(datos.asesor).toBeNull()
  })

  it('sin vehículo que se vea, sin la parte del vehículo; una subasta que no se lee no tumba nada', async () => {
    leerVehiculo.mockResolvedValue({ ok: true, data: null })
    leerSubasta.mockRejectedValue(new Error('x'))
    const datos = (await (await pedir()).json()) as { vehiculo: unknown; titulo: unknown }
    expect(datos.vehiculo).toBeNull()
    expect(datos.titulo).toEqual({ texto: 'Cotización n.º 12', fuente: 'numero' })
  })

  it('sin los ajustes no se adivina la zona: 500', async () => {
    leerAjustes.mockResolvedValue(fallo('inesperado'))
    expect((await pedir()).status).toBe(500)
  })
})
