import { describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import {
  pestanasDelOrigen,
  primeraPestanaAbierta,
  puedeAbrirElOrigen,
  puedeAbrirLaPestana,
  puedeAbrirLaPuestaEnMarcha,
  puedeAbrirOrigenes,
} from './acceso'

const A = '00000000-0000-4000-8000-00000000000a'
const B = '00000000-0000-4000-8000-00000000000b'

const con = (clave: string, origenId: string | null = null): Permisos =>
  [{ clave, origenId, alcance: 'todos' }] as Permisos

describe('puedeAbrirOrigenes', () => {
  it('abre quien gestiona orígenes o configura el flujo o la fórmula de alguno', () => {
    expect(puedeAbrirOrigenes(con('origenes.gestionar'))).toBe(true)
    expect(puedeAbrirOrigenes(con('flujos.configurar', A))).toBe(true)
    expect(puedeAbrirOrigenes(con('cotizaciones.configurar'))).toBe(true)
    expect(puedeAbrirOrigenes(con('logistica.catalogos.gestionar', A))).toBe(true)
  })

  it('una asesora sin esos permisos no entra', () => {
    expect(puedeAbrirOrigenes(con('leads.ver'))).toBe(false)
    expect(puedeAbrirOrigenes([])).toBe(false)
  })
})

describe('puedeAbrirElOrigen', () => {
  it('se mira en el origen: el permiso en otro no alcanza; uno sin origen, sí', () => {
    expect(puedeAbrirElOrigen(con('cotizaciones.configurar', A), A)).toBe(true)
    expect(puedeAbrirElOrigen(con('cotizaciones.configurar', A), B)).toBe(false)
    expect(puedeAbrirElOrigen(con('flujos.configurar'), B)).toBe(true)
    expect(puedeAbrirElOrigen(con('leads.ver'), A)).toBe(false)
  })
})

describe('pestanasDelOrigen', () => {
  it('son las seis, en su orden y con su ruta', () => {
    expect(pestanasDelOrigen(con('origenes.gestionar'), A).map((p) => [p.clave, p.ruta])).toEqual([
      ['fases', `/configuracion/origenes/${A}/fases`],
      ['planilla', `/configuracion/origenes/${A}/planilla`],
      ['hoja', `/configuracion/origenes/${A}/hoja`],
      ['tarjeta', `/configuracion/origenes/${A}/tarjeta`],
      ['campos', `/configuracion/origenes/${A}/campos`],
      ['categorias', `/configuracion/origenes/${A}/categorias`],
    ])
  })

  it('sin el permiso de la pestaña en este origen, apagada con su motivo', () => {
    const motivos = Object.fromEntries(
      pestanasDelOrigen(con('cotizaciones.configurar', A), A).map((p) => [p.clave, p.motivo]),
    )
    expect(motivos).toEqual({
      fases:
        'Lo configura quien tiene el permiso «Configurar el flujo» o «Catálogos de logística».',
      planilla: undefined,
      hoja: undefined,
      tarjeta: undefined,
      campos: undefined,
      categorias: undefined,
    })
    const enOtro = pestanasDelOrigen(con('cotizaciones.configurar', B), A)
    for (const clave of ['planilla', 'hoja', 'tarjeta']) {
      expect(enOtro.find((p) => p.clave === clave)?.motivo).toBe(
        'Lo configura quien tiene el permiso «Configurar el cotizador».',
      )
    }
  })

  it('puedeAbrirLaPestana dice lo mismo que las pestañas', () => {
    expect(puedeAbrirLaPestana(con('flujos.configurar', A), A, 'fases')).toBe(true)
    expect(puedeAbrirLaPestana(con('flujos.configurar', A), A, 'planilla')).toBe(false)
    expect(puedeAbrirLaPestana(con('flujos.configurar', A), A, 'campos')).toBe(true)
  })
})

describe('primeraPestanaAbierta', () => {
  it('es Fases con el flujo, Planilla con el cotizador, Campos con sólo el origen; null para quien no lo abre', () => {
    expect(primeraPestanaAbierta(con('flujos.configurar', A), A)?.clave).toBe('fases')
    expect(primeraPestanaAbierta(con('cotizaciones.configurar', A), A)?.clave).toBe('planilla')
    expect(primeraPestanaAbierta(con('origenes.gestionar', A), A)?.clave).toBe('campos')
    expect(primeraPestanaAbierta(con('flujos.configurar', A), B)).toBeNull()
    expect(primeraPestanaAbierta([], A)).toBeNull()
  })
})

describe('con sólo los catálogos de logística', () => {
  const catalogosEnA = con('logistica.catalogos.gestionar', A)

  it('abre el origen A y su pestaña Fases, no el origen B', () => {
    expect(puedeAbrirElOrigen(catalogosEnA, A)).toBe(true)
    expect(puedeAbrirLaPestana(catalogosEnA, A, 'fases')).toBe(true)
    expect(primeraPestanaAbierta(catalogosEnA, A)?.clave).toBe('fases')
    expect(puedeAbrirElOrigen(catalogosEnA, B)).toBe(false)
    expect(puedeAbrirLaPestana(catalogosEnA, B, 'fases')).toBe(false)
  })

  it('no abre la planilla ni la puesta en marcha', () => {
    expect(puedeAbrirLaPestana(catalogosEnA, A, 'planilla')).toBe(false)
    expect(puedeAbrirLaPuestaEnMarcha(catalogosEnA, A)).toBe(false)
    expect(puedeAbrirLaPuestaEnMarcha(con('flujos.configurar', A), A)).toBe(true)
  })
})
