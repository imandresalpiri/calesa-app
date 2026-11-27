import { describe, expect, it } from 'vitest'
import type { Concesion } from '@/shared/lib/permisos'
import { capacidadesDeLaTarjeta } from './acciones-de-la-tarjeta'

const ORIGEN = '00000000-0000-4000-8000-0000000000a1'
const OTRO = '00000000-0000-4000-8000-0000000000a2'

const de = (clave: Concesion['clave'], origenId: string | null = null): Concesion => ({
  clave,
  origenId,
  alcance: 'todos',
})

describe('capacidadesDeLaTarjeta', () => {
  it('mira cada clave en el origen de la unidad', () => {
    const permisos = [
      de('logistica.ver', ORIGEN),
      de('logistica.documentos.subir', ORIGEN),
      de('logistica.gastos.editar', OTRO),
      de('logistica.pagos.editar', ORIGEN),
    ]
    expect(capacidadesDeLaTarjeta(permisos, ORIGEN)).toEqual({
      subirDocumentos: true,
      editarGastos: false,
      editarPagos: true,
      escribirNotas: true,
    })
  })

  it('sin claves no ofrece nada', () => {
    expect(capacidadesDeLaTarjeta([], ORIGEN)).toEqual({
      subirDocumentos: false,
      editarGastos: false,
      editarPagos: false,
      escribirNotas: false,
    })
  })
})
