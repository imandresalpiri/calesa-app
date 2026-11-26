import { describe, expect, it } from 'vitest'
import { LARGO_MAXIMO_TEXTO } from './config'
import {
  ERRORES_DEL_ASISTENTE,
  accionDelAsistente,
  errorDelAsistente,
  esCausaDelAsistente,
  interpretarRespuesta,
  seCuentaComoUso,
} from './respuesta'

const con = (content: unknown) => ({ choices: [{ message: { content } }] })

describe('interpretarRespuesta', () => {
  it('un 2xx con contenido da el texto recortado y cortado al tope', () => {
    expect(interpretarRespuesta(200, con('  Hola  '))).toEqual({ ok: true, texto: 'Hola' })
    const largo = interpretarRespuesta(200, con('a'.repeat(LARGO_MAXIMO_TEXTO + 10)))
    expect(largo.ok && largo.texto.length).toBe(LARGO_MAXIMO_TEXTO)
  })

  it('un 2xx sin contenido o con otra forma es «vacío»', () => {
    for (const cuerpo of [con(''), con(null), { choices: [] }, { error: 'x' }, null, 'texto']) {
      expect(interpretarRespuesta(200, cuerpo)).toEqual({ ok: false, falla: 'vacio' })
    }
  })

  it('cada código del proveedor da su falla', () => {
    expect(interpretarRespuesta(401, {})).toEqual({
      ok: false,
      falla: 'clave_invalida',
      codigo: 401,
    })
    expect(interpretarRespuesta(403, {})).toMatchObject({ falla: 'clave_invalida' })
    for (const codigo of [408, 429, 500, 502, 503]) {
      expect(interpretarRespuesta(codigo, {})).toEqual({
        ok: false,
        falla: 'no_disponible',
        codigo,
      })
    }
    for (const codigo of [400, 404, 422]) {
      expect(interpretarRespuesta(codigo, {})).toEqual({ ok: false, falla: 'rechazado', codigo })
    }
  })

  it('sólo un 2xx cuenta como uso', () => {
    expect(seCuentaComoUso(200)).toBe(true)
    expect(seCuentaComoUso(204)).toBe(true)
    for (const codigo of [302, 401, 429, 500]) expect(seCuentaComoUso(codigo)).toBe(false)
  })
})

describe('errorDelAsistente', () => {
  it('a quien gestiona le ofrece lo que destraba; a los demás, sólo el mensaje', () => {
    expect(
      errorDelAsistente({ ok: false, falla: 'no_configurado' }, { puedeConfigurar: true }),
    ).toEqual({
      codigo: 'regla',
      mensaje: ERRORES_DEL_ASISTENTE.no_configurado,
      causa: 'configurar',
    })
    expect(
      errorDelAsistente(
        { ok: false, falla: 'clave_invalida', codigo: 401 },
        { puedeConfigurar: true },
      ),
    ).toMatchObject({ causa: 'reemplazar_la_clave' })
    expect(
      errorDelAsistente(
        { ok: false, falla: 'clave_invalida', codigo: 401 },
        { puedeConfigurar: false },
      ),
    ).toEqual({ codigo: 'regla', mensaje: 'La clave del asistente no es válida.' })
  })

  it('el rechazo dice el código; lo que no está disponible no ofrece nada', () => {
    expect(
      errorDelAsistente({ ok: false, falla: 'rechazado', codigo: 404 }, { puedeConfigurar: true }),
    ).toEqual({
      codigo: 'regla',
      mensaje: 'El asistente rechazó el pedido (404). Revisa la dirección y el modelo.',
      causa: 'configurar',
    })
    expect(
      errorDelAsistente({ ok: false, falla: 'sin_tiempo' }, { puedeConfigurar: true }),
    ).toEqual({ codigo: 'inesperado', mensaje: 'El asistente no respondió a tiempo.' })
  })
})

describe('las acciones del asistente', () => {
  it('en Integraciones abren el panel; desde otra pantalla llevan a Integraciones', () => {
    expect(accionDelAsistente('configurar', { enIntegraciones: true })).toEqual({
      tipo: 'panel',
      etiqueta: 'Configurar en Integraciones',
      panel: 'asistente-ia',
    })
    expect(accionDelAsistente('reemplazar_la_clave', { enIntegraciones: false })).toEqual({
      tipo: 'ir',
      etiqueta: 'Reemplazar la clave',
      ruta: '/configuracion/empresa/integraciones?panel=clave-asistente-ia',
    })
  })

  it('reconoce sus causas', () => {
    expect(esCausaDelAsistente('configurar')).toBe(true)
    expect(esCausaDelAsistente('vinculado')).toBe(false)
  })
})
