import { describe, expect, it } from 'vitest'
import { avisoDelTransporte } from './aviso-del-transporte'
import type { EntidadesDeLaUnidad, VehiculosDeLaEntidad } from './lectura-de-la-unidad'
const conEmbarque = (vehiculos: VehiculosDeLaEntidad): EntidadesDeLaUnidad => ({
  embarque: {
    id: '22222222-2222-4222-8222-222222222222',
    booking: 'BK-1',
    actualizadoEn: 'v',
    estado: 'armandose',
    vehiculos,
  },
  contenedorDeLaUnidad: null,
})

const conContenedor = (vehiculos: VehiculosDeLaEntidad): EntidadesDeLaUnidad => ({
  embarque: null,
  contenedorDeLaUnidad: {
    id: '33333333-3333-4333-8333-333333333333',
    numero: 'X1',
    actualizadoEn: 'v',
    estado: 'sin_embarque',
    vehiculos,
  },
})

const solo = { n: 1, hayMas: false, hayOcultas: false }

describe('avisoDelTransporte', () => {
  it('sin transporte, suelta o sola en su embarque: sin aviso', () => {
    expect(avisoDelTransporte(null)).toBeNull()
    expect(avisoDelTransporte({ embarque: null, contenedorDeLaUnidad: null })).toBeNull()
    expect(avisoDelTransporte(conEmbarque(solo))).toBeNull()
    expect(avisoDelTransporte(conContenedor(solo))).toBeNull()
  })

  it('en un embarque con otros: cuántos, hasta «100+»', () => {
    expect(avisoDelTransporte(conEmbarque({ ...solo, n: 2 }))).toBe(
      'Cambia para los 2 vehículos de este embarque.',
    )
    expect(avisoDelTransporte(conEmbarque({ n: 100, hayMas: true, hayOcultas: false }))).toBe(
      'Cambia para los 100+ vehículos de este embarque.',
    )
  })

  it('con vehículos que quien mira no ve: se dicen sin nombrarlos', () => {
    expect(avisoDelTransporte(conEmbarque({ n: 3, hayMas: false, hayOcultas: true }))).toBe(
      'Cambia para los 3 vehículos de este embarque y otros que no puedes ver.',
    )
    expect(avisoDelTransporte(conEmbarque({ ...solo, hayOcultas: true }))).toBe(
      'Cambia para este vehículo y otros que no puedes ver.',
    )
  })

  it('en un contenedor sin embarque no hay nada de todos que se cambie aquí', () => {
    expect(avisoDelTransporte(conContenedor({ ...solo, n: 8 }))).toBeNull()
    expect(avisoDelTransporte(conContenedor({ ...solo, hayOcultas: true }))).toBeNull()
  })

  it('en un contenedor con embarque manda el embarque', () => {
    const lectura = conEmbarque({ ...solo, n: 9 })
    expect(
      avisoDelTransporte({
        ...lectura,
        contenedorDeLaUnidad: conContenedor({ ...solo, n: 8 }).contenedorDeLaUnidad,
      }),
    ).toBe('Cambia para los 9 vehículos de este embarque.')
  })
})
