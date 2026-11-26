import { describe, expect, it } from 'vitest'
import {
  ATAJOS_POR_DEFECTO,
  CONFIG_DEL_ASISTENTE_POR_DEFECTO,
  LARGO_MAXIMO_INSTRUCCION,
  LARGO_MAXIMO_NOMBRE_DE_ATAJO,
  LARGO_MAXIMO_PROMPT_BASE,
  MAX_TOKENS_MAXIMO,
  MAX_TOKENS_MINIMO,
  PREAJUSTES_DEL_ASISTENTE,
  PROMPT_BASE_POR_DEFECTO,
  TOPE_DE_ATAJOS,
  asistenteParaCompartir,
  atajosActivos,
  configDelAsistente,
  guardarBorraLaClave,
  leerConfigDelAsistente,
  origenDeLaDireccion,
} from './config'

// Lo que siembra la migración, con las claves de la base.
const guardada = {
  preajuste: 'otro',
  url_base: 'https://ia.ejemplo.com/v1',
  modelo: 'modelo-x',
  prompt_base: 'Sé breve.',
  atajos: [
    {
      id: 'a5157e00-0000-4000-8000-000000000001',
      nombre: 'Para WhatsApp',
      instruccion: 'Corto y cercano.',
      activo: true,
      max_tokens: 260,
    },
    {
      id: 'a5157e00-0000-4000-8000-000000000004',
      nombre: 'Más corto',
      instruccion: 'Hazlo más corto.',
      activo: false,
      max_tokens: 300,
    },
  ],
  clave_termina_en: 'abcd',
}

describe('la configuración del asistente de IA', () => {
  it('el preajuste DeepSeek es la dirección y el modelo de V1', () => {
    expect(PREAJUSTES_DEL_ASISTENTE.deepseek).toEqual({
      nombre: 'DeepSeek',
      urlBase: 'https://api.deepseek.com',
      modelo: 'deepseek-chat',
    })
    expect(CONFIG_DEL_ASISTENTE_POR_DEFECTO).toMatchObject({
      preajuste: 'deepseek',
      urlBase: 'https://api.deepseek.com',
      modelo: 'deepseek-chat',
      promptBase: PROMPT_BASE_POR_DEFECTO,
      claveTerminaEn: null,
    })
  })

  it('los atajos de fábrica son los cinco de la migración, sin datos de V1 y dentro de los topes', () => {
    expect(ATAJOS_POR_DEFECTO.map((a) => [a.id.slice(-1), a.nombre, a.maxTokens])).toEqual([
      ['1', 'Para WhatsApp', 260],
      ['2', 'Para Facebook', 650],
      ['3', 'Para TikTok', 220],
      ['4', 'Más corto', 300],
      ['5', 'Más formal', 700],
    ])
    expect(ATAJOS_POR_DEFECTO.length).toBeLessThanOrEqual(TOPE_DE_ATAJOS)
    expect(PROMPT_BASE_POR_DEFECTO.length).toBeLessThanOrEqual(LARGO_MAXIMO_PROMPT_BASE)
    for (const atajo of ATAJOS_POR_DEFECTO) {
      expect(atajo.activo).toBe(true)
      expect(atajo.nombre.length).toBeLessThanOrEqual(LARGO_MAXIMO_NOMBRE_DE_ATAJO)
      expect(atajo.instruccion.length).toBeLessThanOrEqual(LARGO_MAXIMO_INSTRUCCION)
      expect(atajo.maxTokens).toBeGreaterThanOrEqual(MAX_TOKENS_MINIMO)
      expect(atajo.maxTokens).toBeLessThanOrEqual(MAX_TOKENS_MAXIMO)
      expect(atajo.instruccion).not.toMatch(/bolivia|http|maps/i)
    }
    expect(PROMPT_BASE_POR_DEFECTO).not.toMatch(/bolivia|http/i)
  })

  it('lee la guardada con los nombres del dominio', () => {
    expect(leerConfigDelAsistente(guardada)).toEqual({
      preajuste: 'otro',
      urlBase: 'https://ia.ejemplo.com/v1',
      modelo: 'modelo-x',
      promptBase: 'Sé breve.',
      atajos: [
        {
          id: 'a5157e00-0000-4000-8000-000000000001',
          nombre: 'Para WhatsApp',
          instruccion: 'Corto y cercano.',
          activo: true,
          maxTokens: 260,
        },
        {
          id: 'a5157e00-0000-4000-8000-000000000004',
          nombre: 'Más corto',
          instruccion: 'Hazlo más corto.',
          activo: false,
          maxTokens: 300,
        },
      ],
      claveTerminaEn: 'abcd',
    })
  })

  it('sin la forma esperada no se llama, y para mostrar vale la de fábrica', () => {
    expect(leerConfigDelAsistente(null)).toBeNull()
    expect(leerConfigDelAsistente({ ...guardada, preajuste: 'openai' })).toBeNull()
    expect(leerConfigDelAsistente({ ...guardada, atajos: [{ id: 'x' }] })).toBeNull()
    expect(configDelAsistente({})).toEqual(CONFIG_DEL_ASISTENTE_POR_DEFECTO)
  })

  it('los atajos activos, en su orden', () => {
    const config = configDelAsistente(guardada)
    expect(atajosActivos(config).map((a) => a.nombre)).toEqual(['Para WhatsApp'])
  })
})

// Espejo de `_asistente_ia_origen()`: lo que la base compara para borrar la clave.
describe('origenDeLaDireccion', () => {
  it('da el esquema, el host y el puerto en minúsculas, sin la ruta', () => {
    expect(origenDeLaDireccion('https://API.deepseek.com/v1')).toBe('https://api.deepseek.com')
    expect(origenDeLaDireccion(' http://127.0.0.1:9999/x ')).toBe('http://127.0.0.1:9999')
  })

  it('el :443 escrito cuenta como otro origen, como en la base', () => {
    expect(origenDeLaDireccion('https://api.deepseek.com:443')).not.toBe(
      origenDeLaDireccion('https://api.deepseek.com'),
    )
  })

  it('sin esquema no hay origen', () => {
    expect(origenDeLaDireccion('api.deepseek.com')).toBeNull()
  })

  it('guardar otro origen con una clave guardada la borra; otra ruta o sin clave, no', () => {
    const conClave = { secretoGuardadoEn: '2026-11-26T12:00:00+00:00' }
    const guardada = 'https://api.deepseek.com'
    expect(guardarBorraLaClave(conClave, guardada, 'https://ia.ejemplo.com')).toBe(true)
    expect(guardarBorraLaClave(conClave, guardada, 'https://API.deepseek.com/v1')).toBe(false)
    expect(
      guardarBorraLaClave({ secretoGuardadoEn: null }, guardada, 'https://ia.ejemplo.com'),
    ).toBe(false)
    // A medio escribir no hay origen todavía: no se avisa.
    expect(guardarBorraLaClave(conClave, guardada, 'htt')).toBe(false)
  })
})

describe('asistenteParaCompartir', () => {
  const fila = { activa: true, config: guardada, secretoGuardadoEn: '2026-11-26T12:00:00+00:00' }

  it('encendido y con clave se puede usar, con los atajos activos', () => {
    expect(asistenteParaCompartir(fila)).toEqual({
      configurado: true,
      atajos: [{ id: 'a5157e00-0000-4000-8000-000000000001', nombre: 'Para WhatsApp' }],
    })
  })

  it('apagado, sin clave, sin la fila o con una configuración ilegible no se puede usar', () => {
    expect(asistenteParaCompartir({ ...fila, activa: false }).configurado).toBe(false)
    expect(asistenteParaCompartir({ ...fila, secretoGuardadoEn: null }).configurado).toBe(false)
    expect(asistenteParaCompartir(undefined)).toEqual({ configurado: false, atajos: [] })
    expect(asistenteParaCompartir({ ...fila, config: {} })).toEqual({
      configurado: false,
      atajos: [],
    })
  })
})
