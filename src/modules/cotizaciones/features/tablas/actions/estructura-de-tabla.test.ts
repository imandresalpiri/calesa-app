import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { RUTAS } from '@/shared/lib/rutas'
import { MOTIVO_SIN_PERMISO_DE_TABLA } from '../../../entities/tablas/publicacion'

const ORIGEN = '11111111-1111-4111-8111-111111111111'
const OTRO_ORIGEN = '44444444-4444-4444-8444-444444444444'
const TABLA = '22222222-2222-4222-8222-222222222222'
const PERSONA = '55555555-5555-4555-8555-555555555555'

const h = vi.hoisted(() => ({
  permisos: [] as { clave: string; origen_id: string | null; alcance: 'propios' | 'todos' }[],
  pedidos: [] as { metodo: string; pedido: unknown }[],
  respuesta: null as ResultadoDeAccion<unknown> | null,
  cache: {
    revalidatePath: vi.fn(),
    revalidateTag: vi.fn(),
    updateTag: vi.fn(),
    refresh: vi.fn(),
  },
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
const registrar = (metodo: string) => (pedido: unknown) => {
  h.pedidos.push({ metodo, pedido })
  return Promise.resolve(h.respuesta)
}
vi.mock('../../../areas/tablas/composicion', () => ({
  repositorioDeTablas: {
    crear: registrar('crear'),
    cambiarColumnas: registrar('cambiarColumnas'),
    desactivar: registrar('desactivar'),
  },
}))

const { crearTabla } = await import('./crear-tabla')
const { cambiarColumnas } = await import('./cambiar-columnas')
const { desactivarTabla } = await import('./desactivar-tabla')

const COLUMNAS = [{ clave: 'monto', etiqueta: ' Monto ', tipo: 'numero' }]
const configura = (origenId: string) => [
  { clave: 'cotizaciones.configurar', origen_id: origenId, alcance: 'todos' as const },
]
const SIN_PERMISO = {
  ok: false,
  error: { codigo: 'sin_permiso', mensaje: MOTIVO_SIN_PERMISO_DE_TABLA },
}

beforeEach(() => {
  h.permisos = configura(ORIGEN)
  h.pedidos.length = 0
  h.respuesta = { ok: true, data: { version: 2 } }
  for (const espia of Object.values(h.cache)) espia.mockClear()
})

describe('crearTabla', () => {
  const pedido = {
    id: TABLA,
    origenId: ORIGEN as string | null,
    nombre: ' Fletes ',
    columnas: COLUMNAS,
  }

  it('sin cotizaciones.configurar del origen no llama a la base', async () => {
    h.permisos = configura(OTRO_ORIGEN)
    expect((await crearTabla(pedido)).data).toEqual(SIN_PERMISO)
    expect(h.pedidos).toEqual([])
  })

  it('una compartida con el permiso en algún origen llama, con el nombre y las etiquetas recortadas', async () => {
    h.permisos = configura(OTRO_ORIGEN)
    await crearTabla({ ...pedido, origenId: null })
    expect(h.pedidos).toEqual([
      {
        metodo: 'crear',
        pedido: {
          ...pedido,
          origenId: null,
          nombre: 'Fletes',
          columnas: [{ clave: 'monto', etiqueta: 'Monto', tipo: 'numero' }],
        },
      },
    ])
    expect(h.cache.revalidatePath).toHaveBeenCalledWith(RUTAS.origenes, 'layout')
  })

  it('una clave de columna que no cumple el patrón no llega a la base', async () => {
    const respuesta = await crearTabla({
      ...pedido,
      columnas: [{ clave: 'Monto', etiqueta: 'M', tipo: 'numero' }],
    })
    expect(respuesta.validationErrors).toBeDefined()
    expect(h.pedidos).toEqual([])
  })
})

describe('cambiarColumnas', () => {
  const pedido = {
    tablaId: TABLA,
    origenId: ORIGEN as string | null,
    columnas: COLUMNAS,
    versionEsperada: 3,
  }

  it('sin permiso no llama', async () => {
    h.permisos = configura(OTRO_ORIGEN)
    expect((await cambiarColumnas(pedido)).data).toEqual(SIN_PERMISO)
    expect(h.pedidos).toEqual([])
  })

  it('manda la tabla, las columnas y la versión, sin el origen', async () => {
    await cambiarColumnas(pedido)
    expect(h.pedidos).toEqual([
      {
        metodo: 'cambiarColumnas',
        pedido: {
          tablaId: TABLA,
          columnas: [{ clave: 'monto', etiqueta: 'Monto', tipo: 'numero' }],
          versionEsperada: 3,
        },
      },
    ])
  })

  it('una columna en uso vuelve con el mensaje de la base y sin revalidar', async () => {
    h.respuesta = {
      ok: false,
      error: {
        codigo: 'regla',
        mensaje: 'La columna «Monto» la usa la fórmula publicada de Japón.',
      },
    }
    expect((await cambiarColumnas(pedido)).data).toEqual(h.respuesta)
    expect(h.cache.revalidatePath).not.toHaveBeenCalled()
  })
})

describe('desactivarTabla', () => {
  const pedido = { tablaId: TABLA, origenId: ORIGEN as string | null, versionEsperada: 1 }

  it('sin permiso no llama', async () => {
    h.permisos = configura(OTRO_ORIGEN)
    expect((await desactivarTabla(pedido)).data).toEqual(SIN_PERMISO)
  })

  it('entra y revalida', async () => {
    h.respuesta = { ok: true, data: { id: TABLA } }
    expect((await desactivarTabla(pedido)).data).toEqual(h.respuesta)
    expect(h.pedidos).toEqual([
      { metodo: 'desactivar', pedido: { tablaId: TABLA, versionEsperada: 1 } },
    ])
    expect(h.cache.revalidatePath).toHaveBeenCalledWith(RUTAS.origenes, 'layout')
  })
})
