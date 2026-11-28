// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

// Lo que se lee con la sesión, simulado; cómo se arman los datos con lo común lo prueba `datos-para-el-pdf.test.ts`.
const leerLoComun = vi.fn()
vi.mock('./datos-para-el-pdf', () => ({
  leerLoComunDelPdf: (origenId: string) => leerLoComun(origenId),
  datosParaElPdf: (comun: unknown, conDatos: unknown) => ({ comun, conDatos }),
}))
const leerVehiculo = vi.fn()
vi.mock('../leer-vehiculo-del-arte', () => ({
  leerVehiculoDelArte: (...args: unknown[]) => leerVehiculo(...args),
}))
const deLaLeida = vi.fn()
vi.mock('../leer-cotizacion-del-arte', () => ({
  cotizacionDelArteDeUnaLeida: (...args: unknown[]) => deLaLeida(...args),
}))
const clienteDe = vi.fn()
vi.mock('../../cotizaciones/datos-de-la-tarjeta', () => ({
  clienteDe: (...args: unknown[]) => clienteDe(...args),
  oNulo: <T>(lectura: Promise<T>) => lectura.catch(() => null),
}))

import { leerDatosDeLaCotizacionParaElPdf } from './datos-de-la-cotizacion-para-el-pdf'

const ORIGEN = '00000000-0000-4000-8000-0000000000b1'
const VEHICULO = '00000000-0000-4000-8000-0000000000c1'
const LEAD = '00000000-0000-4000-8000-0000000000e1'
const sesion = { usuarioId: 'yo', permisos: [], live: { encendido: false } } as never
const laLectura = (vehiculoId: string | null = VEHICULO) =>
  ({ hoja: { cotizacion: { origenId: ORIGEN, vehiculoId, leadId: LEAD } } }) as never
const FIJOS = { asesor: { nombre: 'Teo Vargas' }, empresa: { nombre: 'Calesa Motors' } }
const COMUN = { origen: 'Copart', catalogo: {}, fijos: FIJOS, logos: [] }
const FOTO = { id: 'f1', ruta: 'v/a.webp' }
const COTIZACION = { id: 'c1', numero: 12 }
const fallo = { ok: false, error: { codigo: 'inesperado', mensaje: 'x' } }

const leer = (vehiculoId?: string | null) =>
  leerDatosDeLaCotizacionParaElPdf(sesion, laLectura(vehiculoId))

beforeEach(() => {
  leerLoComun.mockResolvedValue({ ok: true, data: COMUN })
  leerVehiculo.mockResolvedValue({
    ok: true,
    data: { respuesta: { vehiculo: { id: VEHICULO, titulo: 'Hilux' } }, fotos: [FOTO] },
  })
  deLaLeida.mockResolvedValue({
    ok: true,
    data: { respuesta: { cotizacion: COTIZACION, leadId: LEAD }, vehiculoId: VEHICULO },
  })
  clienteDe.mockResolvedValue({ nombre: 'Lucía Paz' })
})
afterEach(() => {
  vi.clearAllMocks()
})

describe('leerDatosDeLaCotizacionParaElPdf', () => {
  it('todo real: la cotización de la guardada, su vehículo con sus fotos, su cliente y el asesor', async () => {
    expect(await leer()).toEqual({
      ok: true,
      data: {
        comun: COMUN,
        conDatos: {
          datos: {
            deEjemplo: false,
            vehiculo: { id: VEHICULO, titulo: 'Hilux' },
            cotizacion: COTIZACION,
            lead: { nombre: 'Lucía Paz' },
            asesor: FIJOS.asesor,
            empresa: FIJOS.empresa,
          },
          fotos: [FOTO],
        },
      },
    })
    expect(leerLoComun).toHaveBeenCalledWith(ORIGEN)
    // Sin los relacionados: el cliente es el de la cotización.
    expect(leerVehiculo).toHaveBeenCalledWith(sesion, {
      id: VEHICULO,
      origen: ORIGEN,
      conLeads: false,
    })
    expect(clienteDe).toHaveBeenCalledWith(sesion, LEAD)
  })

  it('sin vehículo o sin verlo, el arte sale sin él; un error al leer el cliente, sin cliente', async () => {
    clienteDe.mockRejectedValue(new Error('caído'))
    const sinVehiculo = await leer(null)
    expect(leerVehiculo).not.toHaveBeenCalled()
    expect(sinVehiculo).toMatchObject({
      ok: true,
      data: { conDatos: { datos: { vehiculo: null, lead: null }, fotos: [] } },
    })
    leerVehiculo.mockResolvedValue({ ok: true, data: null })
    expect(await leer()).toMatchObject({ data: { conDatos: { datos: { vehiculo: null } } } })
  })

  it('la cotización que ya no se ve es nula; un error del vehículo, de lo común o de la cotización, el fallo', async () => {
    deLaLeida.mockResolvedValue({ ok: true, data: null })
    expect(await leer()).toEqual({ ok: true, data: null })
    deLaLeida.mockResolvedValue(fallo)
    expect(await leer()).toEqual(fallo)
    leerVehiculo.mockResolvedValue(fallo)
    expect(await leer()).toEqual(fallo)
    leerLoComun.mockResolvedValue(fallo)
    expect(await leer()).toEqual(fallo)
  })
})
