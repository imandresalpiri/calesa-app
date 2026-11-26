import { describe, expect, it } from 'vitest'
import { LARGO_MAXIMO_INSTRUCCION, LARGO_MAXIMO_TEXTO, type AtajoDelAsistente } from './config'
import {
  MAX_TOKENS_DE_REESCRIBIR,
  MENSAJE_ATAJO_NO_DISPONIBLE,
  MENSAJE_INSTRUCCION_LARGA,
  MENSAJE_SIN_INSTRUCCION,
  MENSAJE_SIN_TEXTO,
  MENSAJE_TEXTO_LARGO,
  TEMPERATURA_DE_GENERAR,
  TEMPERATURA_DE_REESCRIBIR,
  armarPedidoDeGenerar,
  armarPedidoDePrueba,
  armarPedidoDeReescribir,
} from './pedido'

const ID = 'a5157e00-0000-4000-8000-000000000001'
const atajos: AtajoDelAsistente[] = [
  {
    id: ID,
    nombre: 'Para WhatsApp',
    instruccion: 'Corto y cercano.',
    activo: true,
    maxTokens: 260,
  },
  {
    id: 'a5157e00-0000-4000-8000-000000000004',
    nombre: 'Más corto',
    instruccion: 'Más corto.',
    activo: false,
    maxTokens: 300,
  },
]
const comun = {
  config: { promptBase: '  Sé breve.  ', atajos },
  empresa: { nombre: 'Autos del Sur', pais: 'Chile' },
  texto: '  Toyota Hilux 2020, US$ 25.000.  ',
  firma: 'Wanda Web',
}

describe('el pedido de generar', () => {
  it('lleva la empresa, su país y el prompt base en el sistema; el atajo, la firma y el texto en el usuario', () => {
    const pedido = armarPedidoDeGenerar({ ...comun, atajoId: ID })
    expect(pedido).toEqual({
      ok: true,
      data: {
        mensajes: [
          {
            role: 'system',
            content:
              'Redactas textos para compartir de Autos del Sur, una importadora de vehículos en Chile. Devuelve sólo el texto final, sin comillas ni markdown. Usa sólo los datos del texto: no inventes. Conserva intactos precios, lote, año y enlaces.\n\nIndicaciones de la empresa:\nSé breve.',
          },
          {
            role: 'user',
            content:
              'Indicación: Corto y cercano.\nQuien comparte: Wanda Web\n\nTexto:\nToyota Hilux 2020, US$ 25.000.',
          },
        ],
        maxTokens: 260,
        temperatura: TEMPERATURA_DE_GENERAR,
      },
    })
  })

  it('sin prompt base, sin país y sin firma no los nombra', () => {
    const pedido = armarPedidoDeGenerar({
      ...comun,
      config: { promptBase: ' ', atajos },
      empresa: { nombre: 'Autos', pais: null },
      firma: null,
      atajoId: ID,
    })
    if (!pedido.ok) throw new Error('debía armarse')
    const [sistema, usuario] = pedido.data.mensajes
    expect(sistema?.content).toContain('una importadora de vehículos. Devuelve')
    expect(sistema?.content).not.toContain('Indicaciones de la empresa')
    expect(usuario?.content).not.toContain('Quien comparte')
  })

  it('un atajo apagado o que no está ya no se puede usar', () => {
    for (const atajoId of ['a5157e00-0000-4000-8000-000000000004', 'otro']) {
      expect(armarPedidoDeGenerar({ ...comun, atajoId })).toEqual({
        ok: false,
        error: { codigo: 'regla', mensaje: MENSAJE_ATAJO_NO_DISPONIBLE },
      })
    }
  })

  it('el texto no puede estar vacío ni pasar del tope', () => {
    expect(armarPedidoDeGenerar({ ...comun, texto: '   ', atajoId: ID })).toMatchObject({
      ok: false,
      error: { codigo: 'validacion', mensaje: MENSAJE_SIN_TEXTO },
    })
    const largo = 'a'.repeat(LARGO_MAXIMO_TEXTO + 1)
    expect(armarPedidoDeGenerar({ ...comun, texto: largo, atajoId: ID })).toMatchObject({
      ok: false,
      error: { mensaje: MENSAJE_TEXTO_LARGO },
    })
    expect(
      armarPedidoDeGenerar({ ...comun, texto: 'a'.repeat(LARGO_MAXIMO_TEXTO), atajoId: ID }).ok,
    ).toBe(true)
  })
})

describe('el pedido de reescribir', () => {
  it('lleva la instrucción libre con su tope de salida y su temperatura', () => {
    const pedido = armarPedidoDeReescribir({ ...comun, instruccion: '  Sin emojis. ' })
    if (!pedido.ok) throw new Error('debía armarse')
    expect(pedido.data.mensajes[1]?.content).toBe(
      'Instrucción: Sin emojis.\nQuien comparte: Wanda Web\n\nTexto:\nToyota Hilux 2020, US$ 25.000.',
    )
    expect(pedido.data.maxTokens).toBe(MAX_TOKENS_DE_REESCRIBIR)
    expect(pedido.data.temperatura).toBe(TEMPERATURA_DE_REESCRIBIR)
  })

  it('la instrucción no puede estar vacía ni pasar de 500', () => {
    expect(armarPedidoDeReescribir({ ...comun, instruccion: ' ' })).toMatchObject({
      ok: false,
      error: { mensaje: MENSAJE_SIN_INSTRUCCION },
    })
    expect(
      armarPedidoDeReescribir({ ...comun, instruccion: 'a'.repeat(LARGO_MAXIMO_INSTRUCCION + 1) }),
    ).toMatchObject({ ok: false, error: { mensaje: MENSAJE_INSTRUCCION_LARGA } })
  })
})

it('la prueba de conexión pide lo mínimo', () => {
  expect(armarPedidoDePrueba()).toEqual({
    mensajes: [{ role: 'user', content: 'Responde sólo: ok' }],
    maxTokens: 5,
    temperatura: 0,
  })
})
