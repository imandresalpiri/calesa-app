import { describe, expect, it } from 'vitest'
import { nombrarEnLaHoja } from './anuncios-de-la-rejilla'
import {
  cambiarElTamano,
  EL_BLOQUE_OCUPA_LA_FILA,
  LAS_AVANZADAS_VAN_A_LO_ANCHO,
  textoDelTamano,
} from './anuncios-del-tamano'
import { disenoDeRejillaDePrueba } from './diseno-de-prueba.soporte'
import { lugarDe } from './lugar-en-la-rejilla'

// «base»: A (columna 1) y B (columna 7) de 6 en la fila 1, C de 12 en la fila 2; «extra» al lado de «base»; «av», una avanzada.
const d = disenoDeRejillaDePrueba()
const nombre = nombrarEnLaHoja(
  d,
  new Map([
    ['a', 'A'],
    ['b', 'B'],
    ['c', 'C'],
  ]),
)
const a = { pieza: 'nodo', nodo: 'a' } as const
const b = { pieza: 'nodo', nodo: 'b' } as const
const c = { pieza: 'nodo', nodo: 'c' } as const

describe('cambiar el tamaño de una pieza', () => {
  it('lo que entra se pone y se anuncia lo que mide', () => {
    const r = cambiarElTamano(d, c, { alto: 2 }, nombre)
    expect(r?.anuncio).toBe('«C» mide 12 columnas y 2 filas.')
    expect(r === null ? null : lugarDe(r.diseno, c)?.pieza.alto).toBe(2)
    expect(cambiarElTamano(d, a, { ancho: 5 }, nombre)?.anuncio).toBe(
      '«A» mide 5 columnas y 1 fila.',
    )
    expect(
      cambiarElTamano(d, { pieza: 'seccion', seccion: 'extra' }, { ancho: 4 }, nombre)?.anuncio,
    ).toBe('La sección «Sección sin título» mide 4 columnas y 1 fila.')
  })

  it('lo que no crece deja el diseño igual y dice por qué', () => {
    const contra = (
      p: typeof a | typeof b | typeof c,
      pedido: { ancho?: number; alto?: number },
    ) => {
      const r = cambiarElTamano(d, p, pedido, nombre)
      expect(r?.diseno).toBe(d)
      return r?.anuncio
    }
    expect(contra(a, { ancho: 7 })).toBe('No crece: «B» está al lado.')
    expect(contra(a, { alto: 2 })).toBe('No crece: «C» está debajo.')
    expect(contra(b, { ancho: 7 })).toBe('Ya ocupa hasta la columna 12.')
    expect(contra(c, { alto: 0 })).toBe('Ya mide 1 fila.')
  })

  it('achicar siempre entra hasta 1 columna; ahí dice lo que mide', () => {
    const angosta = cambiarElTamano(d, a, { ancho: 0 }, nombre)
    expect(angosta?.anuncio).toBe('«A» mide 1 columna y 1 fila.')
    const r = cambiarElTamano(angosta?.diseno ?? d, a, { ancho: 0 }, nombre)
    expect(r?.diseno).toBe(angosta?.diseno)
    expect(r?.anuncio).toBe('Ya mide 1 columna.')
  })

  it('el tope de 4 filas', () => {
    const r = cambiarElTamano(d, c, { alto: 4 }, nombre)
    const alta = r?.diseno ?? d
    expect(cambiarElTamano(alta, c, { alto: 5 }, nombre)?.anuncio).toBe('Ya mide 4 filas.')
  })

  it('el bloque «Avanzado», las avanzadas y lo que no está', () => {
    expect(cambiarElTamano(d, { pieza: 'bloque-avanzado' }, { alto: 2 }, nombre)).toEqual({
      diseno: d,
      anuncio: EL_BLOQUE_OCUPA_LA_FILA,
    })
    expect(
      cambiarElTamano(d, { pieza: 'seccion', seccion: 'av' }, { ancho: 4 }, nombre)?.anuncio,
    ).toBe(LAS_AVANZADAS_VAN_A_LO_ANCHO)
    expect(cambiarElTamano(d, { pieza: 'nodo', nodo: 'libre' }, { ancho: 4 }, nombre)).toBeNull()
    expect(cambiarElTamano(d, { pieza: 'cabecera' }, { ancho: 4 }, nombre)).toBeNull()
  })

  it('el texto del tamaño: en singular y la tarjeta del total con mayúscula', () => {
    expect(textoDelTamano({ pieza: 'total' }, nombre, { ancho: 1, alto: 3 })).toBe(
      'La tarjeta del total mide 1 columna y 3 filas.',
    )
  })
})
