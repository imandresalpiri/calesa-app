import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'

const PERSONA = '55555555-5555-4555-8555-555555555555'
const COPART = '11111111-1111-4111-8111-111111111111'
const OTRO = '22222222-2222-4222-8222-222222222222'
const VERSION = '2026-11-28T06:00:00.000001+00:00'

type Pedido = { origenId: string; texto: string; actualizadoEnEsperado: string | null }

const h = vi.hoisted(() => ({
  permisos: [] as { clave: string; origen_id: string | null; alcance: 'propios' | 'todos' }[],
  pedidos: [] as Pedido[],
  respuesta: null as ResultadoDeAccion<{ actualizadoEn: string }> | null,
  tipo: 'subasta' as 'subasta' | 'manual',
  cache: { revalidatePath: vi.fn(), revalidateTag: vi.fn() },
}))

vi.mock('server-only', () => ({}))
vi.mock('next/cache', () => h.cache)
vi.mock('@/shared/lib/supabase/server', () => ({
  createClient: () =>
    Promise.resolve({
      auth: { getClaims: () => Promise.resolve({ data: { claims: { sub: PERSONA } } }) },
      rpc: (nombre: string) =>
        Promise.resolve(
          nombre === 'mis_permisos'
            ? { data: h.permisos, error: null }
            : { data: null, error: { message: `rpc inesperada: ${nombre}` } },
        ),
    }),
}))
vi.mock('@/modules/origenes', () => ({
  getOrigenes: () =>
    Promise.resolve({ ok: true, data: [{ id: COPART, nombre: 'Copart', tipo: h.tipo }] }),
  leerLayout: () =>
    Promise.resolve({
      ok: true,
      data: {
        campos: [
          { clave: 'motor', etiqueta: 'Motor', activo: true },
          { clave: 'traccion', etiqueta: 'Tracción', activo: false },
        ],
        categorias: [],
      },
    }),
}))
vi.mock('../../../composicion', () => ({
  guardarTextoBase: (pedido: Pedido) => {
    h.pedidos.push(pedido)
    return Promise.resolve(h.respuesta)
  },
}))

const { guardarTextoBaseDelOrigen } = await import('./guardar-texto-base')

const pedido = {
  origenId: COPART,
  texto: '{vehiculo}\nLote {lote}',
  actualizadoEnEsperado: VERSION,
}

beforeEach(() => {
  h.permisos = [{ clave: 'cotizaciones.configurar', origen_id: COPART, alcance: 'todos' }]
  h.pedidos.length = 0
  h.respuesta = { ok: true, data: { actualizadoEn: '2026-11-28T07:00:00.000001+00:00' } }
  h.tipo = 'subasta'
  h.cache.revalidatePath.mockClear()
})

describe('guardarTextoBaseDelOrigen', () => {
  it('sin cotizaciones.configurar en ese origen no llama a la base y nombra el origen', async () => {
    h.permisos = [{ clave: 'cotizaciones.configurar', origen_id: OTRO, alcance: 'todos' }]
    const respuesta = await guardarTextoBaseDelOrigen(pedido)
    expect(respuesta.data).toEqual({
      ok: false,
      error: {
        codigo: 'sin_permiso',
        mensaje: 'Sólo quien configura cotizaciones en Copart cambia este texto.',
      },
    })
    expect(h.pedidos).toEqual([])
  })

  it('manda el texto normalizado con la versión y no revalida', async () => {
    const respuesta = await guardarTextoBaseDelOrigen({
      ...pedido,
      texto: '\r\n  {vehiculo}\r\nMotor: {ficha.motor}\t\n',
    })
    expect(h.pedidos).toStrictEqual([
      {
        origenId: COPART,
        texto: '{vehiculo}\nMotor: {ficha.motor}',
        actualizadoEnEsperado: VERSION,
      },
    ])
    expect(respuesta.data).toEqual(h.respuesta)
    expect(h.cache.revalidatePath).not.toHaveBeenCalled()
  })

  it('una variable que el origen no llena no llega a la base y va junto al campo', async () => {
    const respuesta = await guardarTextoBaseDelOrigen({
      ...pedido,
      texto: '{vehiculo} {ficha.traccion}',
    })
    expect(h.pedidos).toEqual([])
    expect(respuesta.data).toEqual({
      ok: false,
      error: {
        codigo: 'validacion',
        mensaje: '{ficha.traccion} no es un dato que el texto base pueda llenar.',
      },
      porCampo: { texto: '{ficha.traccion} no es un dato que el texto base pueda llenar.' },
    })
  })

  it('una de subasta en un origen manual no llega a la base', async () => {
    h.tipo = 'manual'
    const respuesta = await guardarTextoBaseDelOrigen(pedido)
    expect(h.pedidos).toEqual([])
    expect(respuesta.data?.ok).toBe(false)
    expect(respuesta.data && !respuesta.data.ok ? respuesta.data.error.mensaje : null).toBe(
      '{lote} sólo se llena en un origen de subasta.',
    )
  })

  it('en blanco no llega a la base', async () => {
    const respuesta = await guardarTextoBaseDelOrigen({ ...pedido, texto: ' \n\t' })
    expect(h.pedidos).toEqual([])
    expect(respuesta.data && !respuesta.data.ok ? respuesta.data.error.mensaje : null).toBe(
      'El texto base no puede quedar vacío.',
    )
  })
})

describe('guardarTextoBaseDelOrigen: lo que devuelve la base', () => {
  it('un conflicto de la base vuelve tal cual', async () => {
    h.respuesta = {
      ok: false,
      error: { codigo: 'conflicto', mensaje: 'Ana cambió el texto base de Copart hace 2 minutos.' },
    }
    const respuesta = await guardarTextoBaseDelOrigen(pedido)
    expect(respuesta.data).toEqual(h.respuesta)
  })

  it('un 42501 de la base vuelve con el motivo del origen', async () => {
    h.respuesta = { ok: false, error: { codigo: 'sin_permiso', mensaje: 'permission denied' } }
    const respuesta = await guardarTextoBaseDelOrigen(pedido)
    expect(respuesta.data).toEqual({
      ok: false,
      error: {
        codigo: 'sin_permiso',
        mensaje: 'Sólo quien configura cotizaciones en Copart cambia este texto.',
      },
    })
  })

  it('un origen que no es un guid no pasa el esquema', async () => {
    const respuesta = await guardarTextoBaseDelOrigen({ ...pedido, origenId: 'copart' })
    expect(respuesta.validationErrors).toBeDefined()
    expect(h.pedidos).toEqual([])
  })
})
