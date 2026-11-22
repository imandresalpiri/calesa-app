import { describe, expect, it } from 'vitest'
import type { OrigenConUso } from './origen'
import {
  enMarcha,
  estadoDeLaPuestaEnMarcha,
  estadoDelPaso,
  pasoAnterior,
  pasoPendiente,
  pasoSiguiente,
  siguePendienteLaPuestaEnMarcha,
  type PermisosDeLaPuestaEnMarcha,
} from './puesta-en-marcha'

const NUEVO: OrigenConUso['uso'] = {
  vehiculos: 0,
  cotizaciones: 0,
  camposActivos: 0,
  categorias: 0,
  fases: 0,
  formulaPublicada: false,
  concesiones: 0,
  tarjetaPublicada: false,
}

const TODOS: PermisosDeLaPuestaEnMarcha = { gestionar: true, flujo: true, cotizador: true }

const estado = (
  uso: Partial<OrigenConUso['uso']> = {},
  { hayFormulaDeTrabajo = false, permisos = TODOS } = {},
) => estadoDeLaPuestaEnMarcha({ uso: { ...NUEVO, ...uso }, hayFormulaDeTrabajo, permisos })

describe('estadoDeLaPuestaEnMarcha', () => {
  it('un origen recién creado sólo tiene sus datos', () => {
    expect(estado().map((paso) => [paso.clave, paso.hecho])).toEqual([
      ['datos', true],
      ['campos', false],
      ['flujo', false],
      ['formula', false],
      ['tarjeta', false],
      ['publicar', false],
    ])
  })

  it('cada paso se da por hecho con lo que hay, aunque se haya hecho fuera del paso a paso', () => {
    const conTodo = estado({ camposActivos: 3, fases: 2 }, { hayFormulaDeTrabajo: true })
    expect(conTodo.filter((paso) => !paso.hecho).map((paso) => paso.clave)).toEqual(['publicar'])
    expect(
      estado({ formulaPublicada: true }).every(
        (paso) => paso.clave === 'campos' || paso.clave === 'flujo' || paso.hecho,
      ),
    ).toBe(true)
  })

  it('cada paso pide su permiso: Datos y Campos gestionar, Flujo el flujo y los tres últimos el cotizador', () => {
    const soloFlujo = estado({}, { permisos: { gestionar: false, flujo: true, cotizador: false } })
    expect(soloFlujo.filter((paso) => paso.conPermiso).map((paso) => paso.clave)).toEqual(['flujo'])
    const soloCotizador = estado(
      {},
      { permisos: { gestionar: false, flujo: false, cotizador: true } },
    )
    expect(soloCotizador.filter((paso) => paso.conPermiso).map((paso) => paso.clave)).toEqual([
      'formula',
      'tarjeta',
      'publicar',
    ])
  })
})

describe('estadoDelPaso', () => {
  it('sin permiso gana a hecho; si no, hecho o pendiente', () => {
    const [datos, campos] = estado(
      {},
      { permisos: { gestionar: true, flujo: false, cotizador: false } },
    )
    expect(datos && estadoDelPaso(datos)).toBe('hecho')
    expect(campos && estadoDelPaso(campos)).toBe('pendiente')
    const sinGestionar = estado(
      {},
      { permisos: { gestionar: false, flujo: true, cotizador: true } },
    )
    expect(sinGestionar[0] && estadoDelPaso(sinGestionar[0])).toBe('sin_permiso')
  })
})

describe('pasoPendiente', () => {
  it('el primero que falta y la persona puede hacer', () => {
    expect(pasoPendiente(estado())).toBe('campos')
    expect(pasoPendiente(estado({ camposActivos: 1 }))).toBe('flujo')
    expect(pasoPendiente(estado({ camposActivos: 1, fases: 1 }))).toBe('formula')
    expect(
      pasoPendiente(estado({ camposActivos: 1, fases: 1 }, { hayFormulaDeTrabajo: true })),
    ).toBe('publicar')
  })

  it('salta los pasos sin permiso', () => {
    const sinFlujo = estado({ camposActivos: 1 }, { permisos: { ...TODOS, flujo: false } })
    expect(pasoPendiente(sinFlujo)).toBe('formula')
    const soloGestionar = estado(
      { camposActivos: 1 },
      { permisos: { gestionar: true, flujo: false, cotizador: false } },
    )
    expect(pasoPendiente(soloGestionar)).toBe('listo')
  })

  it('listo con la fórmula activa', () => {
    expect(pasoPendiente(estado({ camposActivos: 1, fases: 1, formulaPublicada: true }))).toBe(
      'listo',
    )
  })
})

describe('enMarcha', () => {
  it('mientras no haya fórmula activa', () => {
    expect(enMarcha(estado())).toBe(true)
    expect(enMarcha(estado({}, { hayFormulaDeTrabajo: true }))).toBe(true)
    expect(enMarcha(estado({ formulaPublicada: true }))).toBe(false)
  })
})

describe('siguePendienteLaPuestaEnMarcha', () => {
  it('mientras siga y quede un paso que la persona pueda hacer', () => {
    expect(siguePendienteLaPuestaEnMarcha(estado({ camposActivos: 1, fases: 1 }))).toBe(true)
    expect(siguePendienteLaPuestaEnMarcha(estado())).toBe(true)
    expect(siguePendienteLaPuestaEnMarcha(estado({ formulaPublicada: true }))).toBe(false)
    const sinCotizador = estado(
      { camposActivos: 1, fases: 1 },
      { permisos: { ...TODOS, cotizador: false } },
    )
    expect(siguePendienteLaPuestaEnMarcha(sinCotizador)).toBe(false)
  })
})

describe('pasoSiguiente y pasoAnterior', () => {
  it('siguen el orden aunque el paso no esté hecho', () => {
    const nuevo = estado()
    expect(pasoSiguiente('datos', nuevo)).toBe('campos')
    expect(pasoSiguiente('campos', nuevo)).toBe('flujo')
    expect(pasoSiguiente('tarjeta', nuevo)).toBe('publicar')
    expect(pasoSiguiente('publicar', nuevo)).toBe('listo')
    expect(pasoAnterior('campos', nuevo)).toBe('datos')
    expect(pasoAnterior('datos', nuevo)).toBeNull()
  })

  it('saltan los pasos sin permiso', () => {
    const sinFlujo = estado({}, { permisos: { ...TODOS, flujo: false } })
    expect(pasoSiguiente('campos', sinFlujo)).toBe('formula')
    expect(pasoAnterior('formula', sinFlujo)).toBe('campos')
    const soloFlujo = estado({}, { permisos: { gestionar: false, flujo: true, cotizador: false } })
    expect(pasoSiguiente('flujo', soloFlujo)).toBe('listo')
    expect(pasoAnterior('flujo', soloFlujo)).toBeNull()
  })
})
