import { describe, expect, it } from 'vitest'
import {
  esquemaCrearImagenDeArte,
  esquemaRenombrarImagenDeArte,
  esquemaVerMasImagenes,
} from './imagenes'

const HASH = 'a'.repeat(64)
const OTRO = 'b'.repeat(64)
const base = {
  id: '5f0c8d3e-1b2a-4c5d-8e9f-0a1b2c3d4e5f',
  nombre: 'Logo blanco',
  ruta: `imagenes/${HASH}.png`,
  miniaturaRuta: `miniaturas/${OTRO}.png`,
  tipo: 'png' as const,
  ancho: 800,
  alto: 400,
  ambito: 'personal' as const,
}

describe('esquemaCrearImagenDeArte', () => {
  it('acepta una imagen con su miniatura aparte', () => {
    expect(esquemaCrearImagenDeArte.safeParse(base).success).toBe(true)
  })

  it('acepta un SVG que es su propia miniatura', () => {
    const ruta = `imagenes/${HASH}.svg`
    expect(
      esquemaCrearImagenDeArte.safeParse({ ...base, tipo: 'svg', ruta, miniaturaRuta: ruta })
        .success,
    ).toBe(true)
  })

  it('rechaza un SVG con otra miniatura', () => {
    const ruta = `imagenes/${HASH}.svg`
    expect(esquemaCrearImagenDeArte.safeParse({ ...base, tipo: 'svg', ruta }).success).toBe(false)
  })

  it('rechaza una ruta que no coincide con el tipo', () => {
    expect(esquemaCrearImagenDeArte.safeParse({ ...base, tipo: 'webp' }).success).toBe(false)
  })

  it('rechaza una ruta fuera de la carpeta o sin hash', () => {
    expect(esquemaCrearImagenDeArte.safeParse({ ...base, ruta: `otra/${HASH}.png` }).success).toBe(
      false,
    )
    expect(esquemaCrearImagenDeArte.safeParse({ ...base, ruta: 'imagenes/x.png' }).success).toBe(
      false,
    )
  })

  it('rechaza medidas fuera de 1 a 20000', () => {
    expect(esquemaCrearImagenDeArte.safeParse({ ...base, ancho: 0 }).success).toBe(false)
    expect(esquemaCrearImagenDeArte.safeParse({ ...base, alto: 20001 }).success).toBe(false)
  })
})

describe('esquemaRenombrarImagenDeArte', () => {
  it('pide un nombre con letras', () => {
    const pedido = { id: base.id, actualizadoEnEsperado: '2026-11-27T10:00:00.123456+00:00' }
    expect(esquemaRenombrarImagenDeArte.safeParse({ ...pedido, nombre: 'Fondo' }).success).toBe(
      true,
    )
    expect(esquemaRenombrarImagenDeArte.safeParse({ ...pedido, nombre: '   ' }).success).toBe(false)
  })
})

describe('esquemaVerMasImagenes', () => {
  it('pide un cursor, o nulo para la primera página', () => {
    expect(esquemaVerMasImagenes.safeParse({ cursor: 'abc' }).success).toBe(true)
    expect(esquemaVerMasImagenes.safeParse({ cursor: null }).success).toBe(true)
    expect(esquemaVerMasImagenes.safeParse({ cursor: '' }).success).toBe(false)
    expect(esquemaVerMasImagenes.safeParse({}).success).toBe(false)
  })
})
