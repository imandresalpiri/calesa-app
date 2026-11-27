import { describe, expect, it } from 'vitest'
import { AJUSTES_POR_DEFECTO_DEL_LIVE } from '../../../entities/live'
import {
  esquemaGuardarPersonaDelLive,
  esquemaGuardarRolDelLive,
  esquemaQuitarPersonaDelLive,
  esquemaQuitarRolDelLive,
} from './live'

const ID = '00000000-0000-4000-8000-0000000000e1'
const VERSION = '2026-11-27T10:00:00.123456+00:00'

describe('los esquemas de Configuración › Modo Live', () => {
  it('el rol guarda los ajustes enteros; la versión nula crea la fila', () => {
    expect(
      esquemaGuardarRolDelLive.safeParse({
        rolId: ID,
        ajustes: AJUSTES_POR_DEFECTO_DEL_LIVE,
        actualizadoEnEsperado: null,
      }).success,
    ).toBe(true)
    expect(
      esquemaGuardarRolDelLive.safeParse({
        rolId: ID,
        ajustes: { clientes: 'nombres' },
        actualizadoEnEsperado: VERSION,
      }).success,
    ).toBe(false)
  })

  it('la persona guarda sólo lo que pisa, también nada', () => {
    expect(
      esquemaGuardarPersonaDelLive.safeParse({
        usuarioId: ID,
        ajustes: { clientes: 'nombres' },
        actualizadoEnEsperado: null,
      }).success,
    ).toBe(true)
    expect(
      esquemaGuardarPersonaDelLive.safeParse({
        usuarioId: ID,
        ajustes: {},
        actualizadoEnEsperado: VERSION,
      }).success,
    ).toBe(true)
    expect(
      esquemaGuardarPersonaDelLive.safeParse({
        usuarioId: ID,
        ajustes: { clientes: 'todo' },
        actualizadoEnEsperado: null,
      }).success,
    ).toBe(false)
  })

  it('quitar exige la versión y un id', () => {
    expect(
      esquemaQuitarRolDelLive.safeParse({ rolId: ID, actualizadoEnEsperado: '' }).success,
    ).toBe(false)
    expect(
      esquemaQuitarPersonaDelLive.safeParse({ usuarioId: 'x', actualizadoEnEsperado: VERSION })
        .success,
    ).toBe(false)
  })
})
