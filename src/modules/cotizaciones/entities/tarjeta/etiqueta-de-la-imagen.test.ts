import { describe, expect, it } from 'vitest'
import { coincideLaEtiqueta, etiquetaDeLaImagen, VERSION_DEL_DIBUJO } from './etiqueta-de-la-imagen'

const USUARIO = '00000000-0000-4000-8000-0000000000a1'
const HUELLA = 'i-0123456789abcdef0123456789abcdef'

describe('etiquetaDeLaImagen', () => {
  it('es una ETag fuerte con la huella, quien pide, la versión del dibujo y el ancho', () => {
    expect(etiquetaDeLaImagen({ huella: HUELLA, usuarioId: USUARIO, ancho: null })).toBe(
      `"${HUELLA}.${USUARIO}.v${String(VERSION_DEL_DIBUJO)}.g"`,
    )
    expect(etiquetaDeLaImagen({ huella: HUELLA, usuarioId: USUARIO, ancho: 480 })).toBe(
      `"${HUELLA}.${USUARIO}.v${String(VERSION_DEL_DIBUJO)}.480"`,
    )
  })

  it('otra persona u otro ancho son otra etiqueta', () => {
    const una = etiquetaDeLaImagen({ huella: HUELLA, usuarioId: USUARIO, ancho: null })
    const otra = etiquetaDeLaImagen({
      huella: HUELLA,
      usuarioId: '00000000-0000-4000-8000-0000000000b2',
      ancho: null,
    })
    expect(otra).not.toBe(una)
    expect(etiquetaDeLaImagen({ huella: HUELLA, usuarioId: USUARIO, ancho: 480 })).not.toBe(una)
  })

  it('la variante sin moneda (el Modo Live) suma `.s`: nunca coincide con la otra', () => {
    const con = etiquetaDeLaImagen({ huella: HUELLA, usuarioId: USUARIO, ancho: 480 })
    const sin = etiquetaDeLaImagen({
      huella: HUELLA,
      usuarioId: USUARIO,
      ancho: 480,
      sinMoneda: true,
    })
    expect(sin).toBe(`"${HUELLA}.${USUARIO}.v${String(VERSION_DEL_DIBUJO)}.480.s"`)
    expect(coincideLaEtiqueta(con, sin)).toBe(false)
    expect(coincideLaEtiqueta(sin, con)).toBe(false)
  })
})

describe('coincideLaEtiqueta', () => {
  const etiqueta = etiquetaDeLaImagen({ huella: HUELLA, usuarioId: USUARIO, ancho: 480 })

  it('la misma, la débil, dentro de una lista o `*`', () => {
    expect(coincideLaEtiqueta(etiqueta, etiqueta)).toBe(true)
    expect(coincideLaEtiqueta(`W/${etiqueta}`, etiqueta)).toBe(true)
    expect(coincideLaEtiqueta(`"otra", ${etiqueta}`, etiqueta)).toBe(true)
    expect(coincideLaEtiqueta('*', etiqueta)).toBe(true)
  })

  it('sin cabecera, vacía u otra etiqueta, no', () => {
    expect(coincideLaEtiqueta(null, etiqueta)).toBe(false)
    expect(coincideLaEtiqueta('', etiqueta)).toBe(false)
    expect(coincideLaEtiqueta('"otra"', etiqueta)).toBe(false)
    expect(
      coincideLaEtiqueta(
        etiquetaDeLaImagen({ huella: HUELLA, usuarioId: USUARIO, ancho: null }),
        etiqueta,
      ),
    ).toBe(false)
  })
})
