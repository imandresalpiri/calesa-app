import { afterEach, describe, expect, it, vi } from 'vitest'
import type { EstadoDelLive } from '@/modules/equipo'
import type { Permisos } from '@/shared/lib/permisos'

vi.mock('server-only', () => ({}))
vi.mock('@/modules/equipo/composicion', () => ({ leerSesion: vi.fn(), servicioAcceso: {} }))
vi.mock('@/modules/cotizaciones', () => ({}))
vi.mock('@/modules/vehiculos', () => ({}))
vi.mock('@/shared/lib/almacen', () => ({}))
const leerCliente = vi.fn()
const leerNombres = vi.fn()
vi.mock('@/modules/leads', () => ({
  leerClienteElegido: (id: string) => leerCliente(id),
  leerNombresDeLeads: (ids: string[]) => leerNombres(ids),
}))

const { clienteDe } = await import('./datos-de-la-tarjeta')

const LEAD = '00000000-0000-4000-8000-0000000000cc'
const CON_LEADS: Permisos = [{ clave: 'leads.ver', origenId: null, alcance: 'todos' }]
const APAGADO: EstadoDelLive = { encendido: false, puedeEncender: true }
const enElLive = (
  clientes: 'apagado' | 'nombres' | 'completo',
  nombresDeClientes = false,
): EstadoDelLive => ({
  encendido: true,
  puedeEncender: true,
  nombresDeClientes,
  ajustes: {
    puedeEncender: true,
    vehiculos: true,
    origenes: 'todos',
    cotizaciones: true,
    clientes,
    logistica: 'apagado',
    repuestos: 'apagado',
    inicio: false,
    origenesConfig: 'apagado',
  },
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('clienteDe', () => {
  it('sin el Live: el cliente que se ve con `leads.ver`; sin el permiso o sin lead, ninguno y sin leer', async () => {
    leerCliente.mockResolvedValue({ ok: true, data: { id: LEAD, nombre: 'Juan Pérez' } })
    expect(await clienteDe({ permisos: CON_LEADS, live: APAGADO }, LEAD)).toMatchObject({
      nombre: 'Juan Pérez',
    })
    expect(await clienteDe({ permisos: [], live: APAGADO }, LEAD)).toBeNull()
    expect(await clienteDe({ permisos: CON_LEADS, live: APAGADO }, null)).toBeNull()
    expect(leerCliente).toHaveBeenCalledTimes(1)
  })

  it('con el Live y los clientes ocultos: «Cliente» sin leer nada, también para quien no ve leads', async () => {
    expect(await clienteDe({ permisos: [], live: enElLive('apagado') }, LEAD)).toEqual({
      nombre: 'Cliente',
    })
    expect(leerCliente).not.toHaveBeenCalled()
    expect(leerNombres).not.toHaveBeenCalled()
  })

  it('con «Sólo nombres» y los leads de verdad: sólo el nombre (sin la ficha del lead); si no llega, ninguno', async () => {
    leerNombres.mockResolvedValue({ ok: true, data: new Map([[LEAD, 'Juan Pérez']]) })
    expect(await clienteDe({ permisos: [], live: enElLive('nombres', true) }, LEAD)).toEqual({
      nombre: 'Juan Pérez',
    })
    expect(leerNombres).toHaveBeenCalledWith([LEAD])
    expect(leerCliente).not.toHaveBeenCalled()
    leerNombres.mockResolvedValue({ ok: true, data: new Map() })
    expect(await clienteDe({ permisos: [], live: enElLive('nombres', true) }, LEAD)).toBeNull()
  })

  it('con «Sólo nombres» y sin leads de verdad, «Cliente»; con «Completo», como sin el Live', async () => {
    expect(await clienteDe({ permisos: [], live: enElLive('nombres') }, LEAD)).toEqual({
      nombre: 'Cliente',
    })
    leerCliente.mockResolvedValue({ ok: true, data: { id: LEAD, nombre: 'Juan Pérez' } })
    expect(
      await clienteDe({ permisos: CON_LEADS, live: enElLive('completo') }, LEAD),
    ).toMatchObject({ nombre: 'Juan Pérez' })
    expect(await clienteDe({ permisos: [], live: enElLive('completo') }, LEAD)).toBeNull()
  })
})
