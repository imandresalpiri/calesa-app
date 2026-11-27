import { describe, expect, it } from 'vitest'
import {
  HEREDADO,
  casillasDeOrigenes,
  conElOrigen,
  conLaOpcion,
  formularioDeLaPersona,
  formularioDelRol,
  leerFormulario,
  mismosAjustes,
} from './live-formulario'
import { AJUSTES_POR_DEFECTO_DEL_LIVE } from './live'

const A = '00000000-0000-4000-8000-0000000000d1'
const B = '00000000-0000-4000-8000-0000000000d2'
const ACTIVOS = [A, B]

describe('el formulario del rol', () => {
  it('sin fila empieza de lo por defecto y, sin tocarlo, guarda lo por defecto entero', () => {
    const formulario = formularioDelRol(null)
    expect(formulario.valores).toMatchObject({
      puedeEncender: 'si',
      origenes: 'todos',
      clientes: 'apagado',
    })
    const leido = leerFormulario(formulario)
    expect(leido).toEqual({ ok: true, ajustes: AJUSTES_POR_DEFECTO_DEL_LIVE })
  })

  it('guarda lo elegido: sí/no como booleanos y «Sólo estos» con sus orígenes', () => {
    let formulario = formularioDelRol({ origenes: [A] })
    formulario = conLaOpcion(formulario, 'vehiculos', 'no', { heredado: 'todos', activos: ACTIVOS })
    formulario = conElOrigen(formulario, B, true)
    const leido = leerFormulario(formulario)
    expect(leido.ok && leido.ajustes).toMatchObject({ vehiculos: false, origenes: [A, B] })
  })

  it('«Sólo estos» sin ninguno marcado no se guarda y lo dice en «Orígenes»', () => {
    let formulario = formularioDelRol({ origenes: [A] })
    formulario = conElOrigen(formulario, A, false)
    expect(leerFormulario(formulario)).toEqual({
      ok: false,
      campo: 'origenes',
      motivo: 'Elige al menos un origen o «Todos los orígenes activos».',
    })
  })
})

describe('el formulario de la persona', () => {
  it('lo que no pisa queda heredado y no se guarda', () => {
    const formulario = formularioDeLaPersona({ clientes: 'nombres' })
    expect(formulario.valores.clientes).toBe('nombres')
    expect(formulario.valores.vehiculos).toBe(HEREDADO)
    expect(leerFormulario(formulario)).toEqual({ ok: true, ajustes: { clientes: 'nombres' } })
  })

  it('volver a «Como su rol» en todo deja los ajustes vacíos', () => {
    const formulario = conLaOpcion(formularioDeLaPersona({ inicio: true }), 'inicio', HEREDADO, {
      heredado: 'todos',
      activos: ACTIVOS,
    })
    expect(leerFormulario(formulario)).toEqual({ ok: true, ajustes: {} })
  })
})

describe('las casillas de origen', () => {
  it('con «Todos», todas marcadas y apagadas', () => {
    expect(casillasDeOrigenes(formularioDelRol(null), 'todos')).toMatchObject({
      todas: true,
      apagadas: true,
    })
  })

  it('heredadas, dicen lo del rol y quedan apagadas', () => {
    const casillas = casillasDeOrigenes(formularioDeLaPersona(null), [B])
    expect(casillas.todas).toBe(false)
    expect(casillas.apagadas).toBe(true)
    expect([...casillas.marcados]).toEqual([B])
  })

  it('al pasar a «Sólo estos» empiezan por lo que mostraban', () => {
    const desdeTodos = conLaOpcion(formularioDelRol(null), 'origenes', 'estos', {
      heredado: 'todos',
      activos: ACTIVOS,
    })
    expect(desdeTodos.elegidos).toEqual(ACTIVOS)
    const desdeElRol = conLaOpcion(formularioDeLaPersona(null), 'origenes', 'estos', {
      heredado: [B],
      activos: ACTIVOS,
    })
    expect(desdeElRol.elegidos).toEqual([B])
    expect(casillasDeOrigenes(desdeElRol, [B]).apagadas).toBe(false)
  })

  it('lo marcado con «Sólo estos» se conserva al pasar a «Todos» y volver', () => {
    const opciones = { heredado: 'todos' as const, activos: ACTIVOS }
    let formulario = formularioDelRol({ origenes: [B] })
    formulario = conLaOpcion(formulario, 'origenes', 'todos', opciones)
    formulario = conLaOpcion(formulario, 'origenes', 'estos', opciones)
    expect(formulario.elegidos).toEqual([B])
  })
})

describe('mismosAjustes', () => {
  it('los orígenes, sin importar el orden ni los repetidos', () => {
    expect(mismosAjustes({ origenes: [A, B] }, { origenes: [B, A, A] })).toBe(true)
    expect(mismosAjustes({ origenes: [A] }, { origenes: 'todos' })).toBe(false)
  })

  it('un campo que falta en uno no es lo mismo', () => {
    expect(mismosAjustes(null, {})).toBe(true)
    expect(mismosAjustes({ inicio: false }, {})).toBe(false)
  })
})
