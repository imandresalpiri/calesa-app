import { describe, expect, it } from 'vitest'
import type { EnlaceDeAyudaDeLaEmpresa } from './enlaces-de-ayuda'
import {
  enlacePorId,
  firmaDeEnlaces,
  MENSAJE_DE_ENLACE_NO_DISPONIBLE,
  MENSAJE_DE_PROPIO_NO_DISPONIBLE,
  motivoParaNoAbrirEnlace,
  motivoParaNoAbrirPropio,
  propioPorId,
  textoDelTopeDePropios,
} from './paneles-de-enlaces-de-ayuda'
import type { ElementoDeMisEnlaces } from './mis-enlaces-de-ayuda'

const uno: EnlaceDeAyudaDeLaEmpresa = {
  id: 'a',
  titulo: 'Manual',
  url: 'https://a.com',
  descripcion: null,
  orden: 1,
  activo: true,
  actualizadoEn: '2026-11-26T10:00:00+00:00',
}

describe('los paneles de los enlaces de ayuda', () => {
  it('enlacePorId', () => {
    expect(enlacePorId([uno], 'a')).toBe(uno)
    expect(enlacePorId([uno], 'b')).toBeNull()
    expect(enlacePorId([uno], null)).toBeNull()
  })

  it('«Nuevo» no abre al tope y «Editar» no abre uno que no está', () => {
    expect(motivoParaNoAbrirEnlace({ tope: 1, enlaces: [uno] }, 'nuevo', null)).toMatch(
      /ya tiene 1/,
    )
    expect(motivoParaNoAbrirEnlace({ tope: 30, enlaces: [uno] }, 'nuevo', null)).toBeNull()
    expect(motivoParaNoAbrirEnlace({ tope: 30, enlaces: [uno] }, 'editar', 'b')).toBe(
      MENSAJE_DE_ENLACE_NO_DISPONIBLE,
    )
    expect(motivoParaNoAbrirEnlace({ tope: 30, enlaces: [uno] }, 'editar', 'a')).toBeNull()
    expect(motivoParaNoAbrirEnlace({ tope: 30, enlaces: [] }, null, null)).toBeNull()
  })

  it('la firma cambia con la versión o el orden', () => {
    const a = firmaDeEnlaces({ tope: 30, enlaces: [uno] })
    expect(firmaDeEnlaces({ tope: 30, enlaces: [{ ...uno, actualizadoEn: 'x' }] })).not.toBe(a)
    expect(firmaDeEnlaces({ tope: 30, enlaces: [{ ...uno, orden: 2 }] })).not.toBe(a)
  })
})

describe('los paneles de los enlaces propios', () => {
  const propio: ElementoDeMisEnlaces = {
    tipo: 'propio',
    id: 'p',
    titulo: 'Mía',
    url: 'https://m.com',
    descripcion: null,
  }
  const deLaEmpresa: ElementoDeMisEnlaces = {
    tipo: 'empresa',
    enlace: { id: 'a', titulo: 'A', url: 'https://a.com', descripcion: null },
    oculto: false,
  }

  it('propioPorId no confunde uno de la empresa', () => {
    expect(propioPorId([propio, deLaEmpresa], 'p')).toBe(propio)
    expect(propioPorId([propio, deLaEmpresa], 'a')).toBeNull()
  })

  it('«Agregar» no abre al tope de propios y «Editar» no abre uno que no está', () => {
    expect(motivoParaNoAbrirPropio([propio], 1, 'nuevo', null)).toBe(textoDelTopeDePropios(1))
    expect(motivoParaNoAbrirPropio([propio, deLaEmpresa], 2, 'nuevo', null)).toBeNull()
    expect(motivoParaNoAbrirPropio([propio], 20, 'editar', 'x')).toBe(
      MENSAJE_DE_PROPIO_NO_DISPONIBLE,
    )
    expect(motivoParaNoAbrirPropio([propio], 20, 'editar', 'p')).toBeNull()
    expect(textoDelTopeDePropios(20)).toBe(
      'Ya tienes 20 enlaces propios: quita uno para sumar otro.',
    )
  })
})
