import { describe, expect, it } from 'vitest'
import {
  campoDelRechazoDeCatalogo,
  creadoDesde,
  guardadoDesde,
  textoDeErrorDeCatalogo,
  textoDeUso,
  TOPE_DEL_USO,
} from './catalogos'

const ID = '5f0d0b0e-6a39-4f0e-9a39-0b6f9a1c2d3e'
const VERSION = '2026-11-25T12:00:00.000000+00:00'

describe('textoDeErrorDeCatalogo', () => {
  it('lo que escriben las RPC va tal cual, aunque el nombre que cita parezca técnico', () => {
    for (const code of ['42501', '23505', '22023', '23503']) {
      expect(textoDeErrorDeCatalogo({ code, message: 'Ya hay un puerto «Column» en Chile.' })).toBe(
        'Ya hay un puerto «Column» en Chile.',
      )
    }
  })

  it('otro código, sin código o sin texto: nulo (lo dice `errorDePostgrest`)', () => {
    expect(
      textoDeErrorDeCatalogo({ code: 'PT409', message: 'Ese puerto ya no existe.' }),
    ).toBeNull()
    expect(
      textoDeErrorDeCatalogo({ code: '23514', message: 'violates check constraint' }),
    ).toBeNull()
    expect(textoDeErrorDeCatalogo({ code: null, message: 'Failed to fetch' })).toBeNull()
    expect(textoDeErrorDeCatalogo({ code: '23505', message: '  ' })).toBeNull()
  })
})

describe('campoDelRechazoDeCatalogo', () => {
  const campos = ['nombre', 'pais']

  it('un dato que no vale o un repetido van al campo de su `hint` si es del formulario', () => {
    expect(campoDelRechazoDeCatalogo({ code: '23505', message: 'x', hint: 'nombre' }, campos)).toBe(
      'nombre',
    )
    expect(campoDelRechazoDeCatalogo({ code: '22023', message: 'x', hint: 'pais' }, campos)).toBe(
      'pais',
    )
  })

  it('sin `hint`, con uno que no es del formulario o de otro código: nulo', () => {
    expect(
      campoDelRechazoDeCatalogo({ code: '22023', message: 'x', hint: 'id' }, campos),
    ).toBeNull()
    expect(campoDelRechazoDeCatalogo({ code: '22023', message: 'x' }, campos)).toBeNull()
    expect(
      campoDelRechazoDeCatalogo({ code: '23503', message: 'x', hint: 'nombre' }, campos),
    ).toBeNull()
  })
})

describe('textoDeUso', () => {
  const uso = (n: number, femenino = false) =>
    textoDeUso({ nombre: 'Arica', uso: n, femenino, usadoPor: ['transporte', 'transportes'] })

  it('dice cuántos lo usan, en singular o plural, con el pronombre de su género', () => {
    expect(uso(2)).toBe('Desactivaste «Arica»: lo usan 2 transportes; siguen mostrándolo.')
    expect(uso(1)).toBe('Desactivaste «Arica»: lo usa 1 transporte; sigue mostrándolo.')
    expect(uso(2, true)).toBe('Desactivaste «Arica»: la usan 2 transportes; siguen mostrándola.')
  })

  it('pasado el tope dice «más de 50», nunca el total', () => {
    expect(uso(TOPE_DEL_USO)).toContain('lo usan 50 transportes')
    expect(uso(TOPE_DEL_USO + 1)).toContain('lo usan más de 50 transportes')
  })
})

describe('creadoDesde y guardadoDesde', () => {
  it('leen la respuesta de crear y de guardar', () => {
    expect(creadoDesde({ id: ID, actualizado_en: VERSION, repetido: false })).toEqual({
      id: ID,
      actualizadoEn: VERSION,
    })
    expect(guardadoDesde({ actualizado_en: VERSION, uso: 3, sin_cambios: false })).toEqual({
      actualizadoEn: VERSION,
      uso: 3,
    })
    expect(guardadoDesde({ actualizado_en: VERSION, uso: null, sin_cambios: true })).toEqual({
      actualizadoEn: VERSION,
      uso: null,
    })
  })

  it('una respuesta sin la forma esperada es nula', () => {
    expect(creadoDesde({ id: 'x', actualizado_en: VERSION })).toBeNull()
    expect(creadoDesde(null)).toBeNull()
    expect(guardadoDesde({ actualizado_en: VERSION })).toBeNull()
    expect(guardadoDesde({ actualizado_en: VERSION, uso: -1 })).toBeNull()
  })
})
