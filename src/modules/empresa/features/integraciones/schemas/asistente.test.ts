import { describe, expect, it } from 'vitest'
import { ATAJOS_POR_DEFECTO } from '../../../entities/asistente-ia/config'
import {
  MENSAJE_DIRECCION_DEL_ASISTENTE,
  esquemaGuardarAsistente,
  esquemaGuardarIndicaciones,
  motivosDeLasIndicaciones,
} from './asistente'

const version = '2026-11-26T12:00:00+00:00'
const ID = 'a5157e00-0000-4000-8000-000000000001'
const OTRO = 'a5157e00-0000-4000-8000-000000000002'

describe('esquemaGuardarAsistente', () => {
  const proveedor = (resto: object) =>
    esquemaGuardarAsistente.safeParse({ actualizadoEnEsperado: version, ...resto })

  it('prender o apagar no manda la configuración', () => {
    expect(proveedor({ activa: true }).data).toEqual({
      actualizadoEnEsperado: version,
      activa: true,
    })
  })

  it('con DeepSeek la dirección y el modelo son los del preajuste', () => {
    expect(
      proveedor({ preajuste: 'deepseek', urlBase: 'https://otro.example', modelo: 'x' }).data,
    ).toMatchObject({ urlBase: 'https://api.deepseek.com', modelo: 'deepseek-chat' })
  })

  it('otro proveedor guarda lo escrito, sin espacios alrededor', () => {
    expect(
      proveedor({ preajuste: 'otro', urlBase: ' https://ia.example/v1 ', modelo: ' m-1 ' }).data,
    ).toMatchObject({ urlBase: 'https://ia.example/v1', modelo: 'm-1' })
  })

  it('la dirección va con https y fuera de la red interna; el loopback pasa (lo corta el servidor)', () => {
    const motivo = (urlBase: string) =>
      proveedor({ preajuste: 'otro', urlBase, modelo: 'm' }).error?.issues[0]?.message
    expect(motivo('http://ia.example')).toBe(MENSAJE_DIRECCION_DEL_ASISTENTE)
    expect(motivo('https://10.0.0.5/v1')).toBe(MENSAJE_DIRECCION_DEL_ASISTENTE)
    expect(motivo('https://usuario:clave@ia.example')).toBe(MENSAJE_DIRECCION_DEL_ASISTENTE)
    expect(motivo('')).toBe('Escribe la dirección base.')
    expect(
      proveedor({ preajuste: 'otro', urlBase: 'http://127.0.0.1:9', modelo: 'm' }).success,
    ).toBe(true)
  })

  it('el modelo va sin espacios y la configuración, entera', () => {
    const base = { preajuste: 'otro', urlBase: 'https://ia.example' }
    expect(proveedor({ ...base, modelo: 'mi modelo' }).error?.issues[0]?.message).toBe(
      'El modelo va sin espacios.',
    )
    expect(proveedor(base).error?.issues[0]?.path).toEqual(['urlBase'])
    expect(proveedor({ ...base, preajuste: 'openai', modelo: 'm' }).success).toBe(false)
  })
})

describe('esquemaGuardarIndicaciones', () => {
  const atajo = (resto: object = {}) => ({
    id: ID,
    nombre: 'Para WhatsApp',
    instruccion: 'Corto.',
    activo: true,
    maxTokens: 260,
    ...resto,
  })
  const indicaciones = (resto: object) =>
    esquemaGuardarIndicaciones.safeParse({
      actualizadoEnEsperado: version,
      promptBase: '',
      atajos: [],
      ...resto,
    })

  it('los atajos de fábrica pasan', () => {
    expect(indicaciones({ atajos: ATAJOS_POR_DEFECTO }).success).toBe(true)
  })

  it('el prompt base puede ir vacío y hasta 4.000 caracteres', () => {
    expect(indicaciones({ promptBase: 'x'.repeat(4000) }).success).toBe(true)
    expect(indicaciones({ promptBase: 'x'.repeat(4001) }).error?.issues[0]?.path).toEqual([
      'promptBase',
    ])
  })

  it('hasta 20 atajos', () => {
    const muchos = Array.from({ length: 21 }, (_, i) =>
      atajo({ id: `a5157e00-0000-4000-8000-${String(i).padStart(12, '0')}`, nombre: `A${i}` }),
    )
    expect(indicaciones({ atajos: muchos }).error?.issues[0]?.message).toBe(
      'Llegaste a 20 atajos: quita uno para sumar otro.',
    )
  })

  it('cada motivo va a su fila; un nombre repetido, sin mirar mayúsculas, al segundo', () => {
    const atajos = [atajo(), atajo({ id: OTRO, nombre: 'para whatsapp ', instruccion: ' ' })]
    const leido = indicaciones({ atajos })
    expect(motivosDeLasIndicaciones(leido.error?.issues ?? [], atajos)).toEqual({
      [`${OTRO}:instruccion`]: 'Escribe qué tiene que hacer el atajo.',
      [`${OTRO}:nombre`]: 'Ya hay un atajo con ese nombre.',
    })
  })

  it('un nombre de más de 40 o una instrucción de más de 500 no pasan', () => {
    const atajos = [atajo({ nombre: 'n'.repeat(41), instruccion: 'i'.repeat(501) })]
    expect(motivosDeLasIndicaciones(indicaciones({ atajos }).error?.issues ?? [], atajos)).toEqual({
      [`${ID}:nombre`]: 'El nombre va hasta 40 caracteres.',
      [`${ID}:instruccion`]: 'La instrucción va hasta 500 caracteres.',
    })
  })
})
