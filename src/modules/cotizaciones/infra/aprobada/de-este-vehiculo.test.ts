import { beforeEach, describe, expect, it, vi } from 'vitest'
import { codificarCursor, leerCursor } from '@/shared/lib/paginacion'

vi.mock('server-only', () => ({}))

const llamadas: [string, ...unknown[]][] = []
let respuesta: { data: unknown; error: unknown } = { data: [], error: null }
vi.mock('@/shared/lib/supabase/server', () => ({
  createClient: () =>
    Promise.resolve({
      rpc: (nombre: string, args: unknown) => {
        llamadas.push(['rpc', nombre, args])
        return Promise.resolve(respuesta)
      },
    }),
}))

import { getPaginaDeEsteVehiculo } from './de-este-vehiculo'

const VEHICULO = '00000000-0000-4000-8000-0000000000aa'
const fila = (i: number, extra: Record<string, unknown> = {}) => ({
  id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
  numero: 100 - i,
  origen_id: '00000000-0000-4000-8000-0000000000a1',
  origen: 'Japón',
  clase: 'preventa',
  estado: 'activa',
  titulo: null,
  total: 10,
  moneda: null,
  modo: null,
  autor: 'Gala',
  creado_en: `2026-10-29T08:${String(59 - i).padStart(2, '0')}:00.123456+00:00`,
  editada_en: '2026-10-29T09:00:00.654321+00:00',
  vencida: false,
  vence_el: '2026-11-27',
  aprobada: false,
  fijada: false,
  privada: false,
  ...extra,
})

describe('getPaginaDeEsteVehiculo (servidor)', () => {
  beforeEach(() => {
    llamadas.length = 0
    respuesta = { data: [], error: null }
  })

  it('sin cursor, o con uno que no se lee o hacia atrás, pide la primera página de 10', async () => {
    const atras = codificarCursor({
      instante: '2026-10-29T08:00:00.123456+00:00',
      id: fila(3).id,
      sentido: 'anterior',
    })
    for (const cursor of [null, 'no-es-un-cursor', atras]) {
      await getPaginaDeEsteVehiculo({ vehiculoId: VEHICULO, cursor })
    }
    expect(llamadas).toEqual(
      Array.from({ length: 3 }, () => [
        'rpc',
        'cotizaciones_de_este_vehiculo',
        { p_vehiculo: VEHICULO, p_tamano: 10 },
      ]),
    )
  })

  it('con el `siguiente` de una página manda su instante tal cual y su id', async () => {
    const instante = '2026-10-29T08:00:00.123456+00:00'
    const cursor = codificarCursor({ instante, id: fila(3).id, sentido: 'siguiente' })
    await getPaginaDeEsteVehiculo({ vehiculoId: VEHICULO, cursor })
    expect(llamadas[0]?.[2]).toEqual({
      p_vehiculo: VEHICULO,
      p_tamano: 10,
      p_cursor_en: instante,
      p_cursor_id: fila(3).id,
    })
  })

  it('con 11 filas y la fijada: la página de 10, el cursor desde la décima (no la fijada) y la fijada aparte', async () => {
    respuesta = {
      data: [
        fila(50, { fijada: true, aprobada: true }),
        ...Array.from({ length: 11 }, (_, i) => fila(i)),
      ],
      error: null,
    }
    const leido = await getPaginaDeEsteVehiculo({ vehiculoId: VEHICULO, cursor: null })
    if (!leido.ok) throw new Error('debía leer')
    expect(leido.data.filas).toHaveLength(10)
    expect(leido.data.fijada?.id).toBe(fila(50).id)
    expect(leerCursor(leido.data.siguiente)).toMatchObject({
      id: fila(9).id,
      instante: fila(9).creado_en,
    })
  })

  it('un vehículo que no es un guid no llega a la base; una forma mala o un error vuelven como valor', async () => {
    expect(await getPaginaDeEsteVehiculo({ vehiculoId: 'x', cursor: null })).toMatchObject({
      ok: false,
      error: { codigo: 'validacion' },
    })
    expect(llamadas).toEqual([])
    respuesta = { data: [{ id: 'x' }], error: null }
    expect(await getPaginaDeEsteVehiculo({ vehiculoId: VEHICULO, cursor: null })).toMatchObject({
      ok: false,
      error: { codigo: 'inesperado' },
    })
    respuesta = { data: null, error: { code: '42501', message: 'no' } }
    expect((await getPaginaDeEsteVehiculo({ vehiculoId: VEHICULO, cursor: null })).ok).toBe(false)
  })
})
