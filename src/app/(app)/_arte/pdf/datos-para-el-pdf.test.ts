// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FijosDelArte } from '@/modules/artes'

vi.mock('server-only', () => ({}))

// Cómo se arman los datos es lo de verdad (`entities/`); lo que se lee con la sesión, simulado.
vi.mock('@/modules/artes', async () => ({
  ...(await vi.importActual<object>('@/modules/artes/entities/datos/ejemplo-con-datos')),
  ...(await vi.importActual<object>('@/modules/artes/entities/editor/datos-de-ejemplo')),
  ...(await vi.importActual<object>('@/modules/artes/entities/datos/variables-del-arte')),
}))
const leerLogos = vi.fn()
vi.mock('@/modules/empresa', async () => ({
  ...(await vi.importActual<object>('@/modules/empresa/entities/logos')),
  leerLogos: () => leerLogos(),
}))
const getOrigenes = vi.fn()
vi.mock('@/modules/origenes', () => ({
  getOrigenes: () => getOrigenes(),
  leerLayout: () => Promise.resolve({ ok: true, data: { campos: [] } }),
}))
const leerVehiculo = vi.fn()
const leerCotizacion = vi.fn()
vi.mock('../leer-vehiculo-del-arte', () => ({
  leerVehiculoDelArte: (...args: unknown[]) => leerVehiculo(...args),
}))
vi.mock('../leer-cotizacion-del-arte', () => ({
  leerCotizacionDelArte: (...args: unknown[]) => leerCotizacion(...args),
}))
const FIJOS: FijosDelArte = {
  asesor: { nombre: 'Teo Vargas', cargo: null, whatsapp: null },
  empresa: {
    nombre: 'Calesa Motors',
    web: null,
    redes: {},
    zona: 'America/La_Paz',
    locale: 'es-BO',
  },
}
vi.mock('../leer-fijos-del-arte', () => ({ leerFijosDelArte: () => Promise.resolve(FIJOS) }))

import { leerDatosParaElPdf } from './datos-para-el-pdf'

const ORIGEN = '00000000-0000-4000-8000-0000000000b1'
const VEHICULO = '00000000-0000-4000-8000-0000000000c1'
const OTRO_VEHICULO = '00000000-0000-4000-8000-0000000000c2'
const COTIZACION = '00000000-0000-4000-8000-0000000000d1'
const LEAD = '00000000-0000-4000-8000-0000000000e1'
const FOTO = {
  id: '00000000-0000-4000-8000-0000000000f1',
  ruta: 'v/a.webp',
  rutaMiniatura: 'v/a-480.webp',
}
const sesion = { usuarioId: 'yo', permisos: [], live: { encendido: false } }

const vehiculo = {
  respuesta: {
    vehiculo: {
      id: VEHICULO,
      titulo: 'Toyota Hilux 2021',
      fotos: [{ id: FOTO.id, ancho: 1600, alto: 1200 }],
    },
    leads: { grupos: [{ tipo: 'interesado', leads: [{ leadId: LEAD, nombre: 'Lucía Paz' }] }] },
  },
  fotos: [FOTO],
}
const cotizacion = (vehiculoId: string | null = VEHICULO) => ({
  ok: true,
  data: { respuesta: { cotizacion: { id: COTIZACION, numero: 12 }, leadId: null }, vehiculoId },
})
const logos = {
  ok: true,
  data: {
    tope: 12,
    variantes: [
      {
        id: 'principal',
        nombre: 'Principal',
        uso: 'principal',
        ruta: 'marca/a.svg',
        tipo: 'svg',
        ancho: null,
        alto: null,
      },
      {
        id: 'oscuro',
        nombre: 'Para fondo oscuro',
        uso: 'oscuro',
        ruta: null,
        tipo: null,
        ancho: null,
        alto: null,
      },
    ],
  },
}

const leer = (eleccion: Parameters<typeof leerDatosParaElPdf>[1]['eleccion']) =>
  leerDatosParaElPdf(sesion as unknown as Parameters<typeof leerDatosParaElPdf>[0], {
    origenId: ORIGEN,
    eleccion,
  })

beforeEach(() => {
  getOrigenes.mockResolvedValue({
    ok: true,
    data: [{ id: ORIGEN, nombre: 'Copart', tipo: 'subasta' }],
  })
  leerLogos.mockResolvedValue(logos)
  leerVehiculo.mockResolvedValue({ ok: true, data: vehiculo })
  leerCotizacion.mockResolvedValue(cotizacion())
})
afterEach(() => {
  vi.clearAllMocks()
})

describe('leerDatosParaElPdf', () => {
  it('sin elección, los datos de ejemplo con el nombre del origen, sin leer ningún vehículo', async () => {
    const leidos = await leer(null)
    expect(leidos.ok && leidos.data?.datos.deEjemplo).toBe(true)
    expect(leidos.ok && leidos.data?.datos.vehiculo?.origen).toBe('Copart')
    expect(leidos.ok && leidos.data?.deDonde).toMatchObject({
      vehiculoId: null,
      cotizacionId: null,
      fotos: [],
    })
    expect(leerVehiculo).not.toHaveBeenCalled()
  })

  it('con elección, vuelve a leer el vehículo en el origen de la plantilla, su cotización y su lead', async () => {
    const leidos = await leer({ vehiculoId: VEHICULO, cotizacionId: COTIZACION, leadId: LEAD })
    expect(leerVehiculo).toHaveBeenCalledWith(sesion, { id: VEHICULO, origen: ORIGEN })
    expect(leerCotizacion).toHaveBeenCalledWith(sesion, COTIZACION)
    if (!leidos.ok || leidos.data === null) {
      throw new Error('sin datos')
    }
    const { datos, deDonde, logos: delEditor, catalogo } = leidos.data
    expect(datos.deEjemplo).toBe(false)
    expect(datos.vehiculo?.titulo).toBe('Toyota Hilux 2021')
    expect(datos.cotizacion?.numero).toBe(12)
    expect(datos.lead).toEqual({ nombre: 'Lucía Paz' })
    expect(datos.asesor).toEqual(FIJOS.asesor)
    expect(deDonde).toMatchObject({ vehiculoId: VEHICULO, cotizacionId: COTIZACION, fotos: [FOTO] })
    // Sólo los logos con archivo; al editor, sin su ruta.
    expect(delEditor).toEqual([{ id: 'principal', nombre: 'Principal', ancho: null, alto: null }])
    expect(deDonde.logos.map((l) => l.ruta)).toEqual(['marca/a.svg'])
    expect(catalogo.tipo).toBe('subasta')
  })

  it('una cotización de otro vehículo o que ya no se ve no va; un lead que no es de sus relacionados, tampoco', async () => {
    leerCotizacion.mockResolvedValue(cotizacion(OTRO_VEHICULO))
    const otra = await leer({ vehiculoId: VEHICULO, cotizacionId: COTIZACION, leadId: VEHICULO })
    expect(otra.ok && otra.data?.datos.cotizacion).toBeNull()
    expect(otra.ok && otra.data?.datos.lead).toBeNull()
    expect(otra.ok && otra.data?.deDonde.cotizacionId).toBeNull()

    leerCotizacion.mockResolvedValue({ ok: true, data: null })
    const oculta = await leer({ vehiculoId: VEHICULO, cotizacionId: COTIZACION, leadId: null })
    expect(oculta.ok && oculta.data?.datos.cotizacion).toBeNull()
  })

  it('el vehículo que ya no se ve es nulo; un fallo al leerlo o al leer el origen, el fallo', async () => {
    leerVehiculo.mockResolvedValue({ ok: true, data: null })
    expect(await leer({ vehiculoId: VEHICULO, cotizacionId: null, leadId: null })).toEqual({
      ok: true,
      data: null,
    })
    leerVehiculo.mockResolvedValue({ ok: false, error: { codigo: 'inesperado', mensaje: 'x' } })
    expect((await leer({ vehiculoId: VEHICULO, cotizacionId: null, leadId: null })).ok).toBe(false)
    getOrigenes.mockResolvedValue({ ok: true, data: [] })
    expect((await leer(null)).ok).toBe(false)
  })
})
