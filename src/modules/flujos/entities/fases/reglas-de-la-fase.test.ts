import { describe, expect, it } from 'vitest'
import type { FaseParaConfigurar } from '../flujo'
import { reglasQueAfectanALaFase, textoDeLaRegla } from './reglas-de-la-fase'

const fase = (extra: Partial<FaseParaConfigurar> = {}): FaseParaConfigurar => ({
  id: '00000000-0000-4000-8000-000000000001',
  nombre: 'Aduana',
  descripcion: null,
  color: '#465fff',
  icono: null,
  orden: 10,
  activa: true,
  esInicial: false,
  esFinal: false,
  esLogistica: false,
  demoraDias: null,
  alertaCadaHoras: null,
  notaObligatoria: false,
  permiteContenedor: false,
  permiteAduana: false,
  cuentaLlegadaRepuestos: false,
  publicaWeb: false,
  visiblePortal: false,
  aliasPortal: null,
  descripcionPortal: null,
  esSubasta: false,
  posicion: null,
  ...extra,
})

const vehiculos = (reglas: { regla: string; activa: boolean }[]) => ({
  ambito: 'vehiculos' as const,
  reglas,
  origenEsSubasta: false,
})

describe('reglasQueAfectanALaFase', () => {
  it('nombra las cuatro reglas de un flujo de vehículos, encendidas o no, y lo que la fase tiene marcado', () => {
    const reglas = reglasQueAfectanALaFase(
      vehiculos([
        { regla: 'aduana', activa: true },
        { regla: 'vitrina_web', activa: false },
      ]),
      fase({ publicaWeb: true }),
    )
    expect(reglas.map((r) => [r.regla, r.activa, r.encendidoEnLaFase])).toEqual([
      ['vitrina_web', false, true],
      ['portal_cliente', false, false],
      ['aduana', true, false],
      ['logistica', false, false],
    ])
  })

  it('en repuestos sólo la de logística: las otras no existen ahí', () => {
    const reglas = reglasQueAfectanALaFase(
      { ambito: 'repuestos', reglas: [], origenEsSubasta: false },
      fase(),
    )
    expect(reglas.map((r) => r.regla)).toEqual(['logistica'])
  })
})

describe('textoDeLaRegla', () => {
  const [vitrina, , aduana] = reglasQueAfectanALaFase(
    vehiculos([{ regla: 'aduana', activa: true }]),
    fase({ publicaWeb: true }),
  )

  it('encendida dice qué puede marcar la fase; apagada, qué no y si quedó marcada de antes', () => {
    expect(aduana && textoDeLaRegla(aduana)).toBe(
      'La regla «Aduana» está encendida: la fase puede marcar «Permite aduana».',
    )
    expect(vitrina && textoDeLaRegla(vitrina)).toBe(
      'La regla «Vitrina web» está apagada: «Se publica en la web» no se puede encender. La fase la tiene marcada de antes.',
    )
  })
})
