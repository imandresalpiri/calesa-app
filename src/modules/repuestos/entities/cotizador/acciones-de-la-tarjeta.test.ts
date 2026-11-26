import { describe, expect, it } from 'vitest'
import {
  MOTIVO_DEL_PROYECTO_CERRADO,
  MOTIVO_SIN_CONEXION,
  accionesDeLaTarjeta,
  motivoParaElegir,
} from './acciones-de-la-tarjeta'
import { MOTIVOS_PARA_NO_ACEPTAR } from './hoja-editable'

const base = {
  estado: 'borrador',
  total: '120.00',
  puedeEditarItems: true,
  cerrado: false,
} as const
const claves = (e: Parameters<typeof accionesDeLaTarjeta>[0]) =>
  accionesDeLaTarjeta(e).map((a) => a.clave)
const motivo = (e: Parameters<typeof accionesDeLaTarjeta>[0], clave: 'aceptar' | 'anular') =>
  accionesDeLaTarjeta(e).find((a) => a.clave === clave)?.motivo

describe('accionesDeLaTarjeta', () => {
  it('una borrador con total lleva Abrir, Aceptar y Anular, todas posibles', () => {
    expect(claves(base)).toEqual(['abrir', 'aceptar', 'anular'])
    expect(accionesDeLaTarjeta(base).map((a) => a.motivo)).toEqual([null, null, null])
  })

  it('una aceptada sólo se abre o se anula', () => {
    expect(claves({ ...base, estado: 'aceptada' })).toEqual(['abrir', 'anular'])
  })

  it('una anulada sólo se abre', () => {
    expect(claves({ ...base, estado: 'anulada' })).toEqual(['abrir'])
  })

  it('«Aceptar» sin total o sin repuestos.editar queda apagada con su motivo', () => {
    expect(motivo({ ...base, total: null }, 'aceptar')).toBe(MOTIVOS_PARA_NO_ACEPTAR.sinTotal)
    expect(motivo({ ...base, puedeEditarItems: false }, 'aceptar')).toBe(
      MOTIVOS_PARA_NO_ACEPTAR.permiso,
    )
  })

  it('«Abrir» nunca se apaga y «Anular» no pide repuestos.editar', () => {
    const sinPermiso = { ...base, puedeEditarItems: false }
    expect(accionesDeLaTarjeta(sinPermiso)[0]?.motivo).toBeNull()
    expect(motivo(sinPermiso, 'anular')).toBeNull()
  })

  it('con el proyecto cerrado, «Aceptar» y «Anular» se apagan con el mismo motivo; «Abrir» no', () => {
    const cerrado = { ...base, cerrado: true }
    expect(motivo(cerrado, 'aceptar')).toBe(MOTIVO_DEL_PROYECTO_CERRADO)
    expect(motivo({ ...cerrado, estado: 'aceptada' }, 'anular')).toBe(MOTIVO_DEL_PROYECTO_CERRADO)
    expect(accionesDeLaTarjeta(cerrado)[0]?.motivo).toBeNull()
  })
})

describe('accionesDeLaTarjeta sin red', () => {
  it('apaga «Aceptar» y «Anular» con «Sin conexión…» y deja «Abrir»; un motivo de fondo manda', () => {
    const sinRed = { ...base, enLinea: false }
    expect(motivo(sinRed, 'aceptar')).toBe(MOTIVO_SIN_CONEXION)
    expect(motivo(sinRed, 'anular')).toBe(MOTIVO_SIN_CONEXION)
    expect(accionesDeLaTarjeta(sinRed)[0]?.motivo).toBeNull()
    expect(motivo({ ...sinRed, total: null }, 'aceptar')).toBe(MOTIVOS_PARA_NO_ACEPTAR.sinTotal)
  })
})

describe('motivoParaElegir', () => {
  it('una cotización que ya no está o que cambió de estado no abre la confirmación', () => {
    expect(motivoParaElegir('aceptar', null)).toMatch(/ya no está/)
    expect(motivoParaElegir('aceptar', { ...base, estado: 'aceptada' })).toMatch(/ya no admite/)
    expect(motivoParaElegir('anular', { ...base, estado: 'anulada' })).toMatch(/ya no admite/)
  })

  it('una posible no tiene motivo; una apagada dice el suyo', () => {
    expect(motivoParaElegir('aceptar', base)).toBeNull()
    expect(motivoParaElegir('aceptar', { ...base, total: null })).toBe(
      MOTIVOS_PARA_NO_ACEPTAR.sinTotal,
    )
  })
})
