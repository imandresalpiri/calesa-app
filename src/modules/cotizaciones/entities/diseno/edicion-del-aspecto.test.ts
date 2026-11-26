import { describe, expect, it } from 'vitest'
import { esquemaDiseno } from '../diseno'
import { celda, disenoDe, seccion } from './diseno-de-prueba.soporte'
import {
  ponerAspectoDeItem,
  ponerAspectoDeLaCabecera,
  ponerAspectoDeSeccion,
} from './edicion-del-aspecto'

const base = disenoDe([
  seccion('s', [
    celda('a', { ancho: 'mitad' }),
    { tipo: 'interruptor', nodo: 'libre', efecto: 'muestra' },
  ]),
  seccion('t', [celda('c')]),
])

describe('ponerAspectoDeSeccion', () => {
  it('escribe el aspecto, no muta lo que recibe y queda un diseño válido', () => {
    const d = ponerAspectoDeSeccion(base, 's', {
      ancho: 8,
      alto: 3,
      relleno: 'chico',
      separacion: 'grande',
      densidad: 'compacta',
      letra: 'grande',
      enfasis: 'fuerte',
      tono: 'verde',
    })
    expect(d.secciones[0]).toMatchObject({
      ancho: 8,
      alto: 3,
      relleno: 'chico',
      separacion: 'grande',
      densidad: 'compacta',
      letra: 'grande',
      enfasis: 'fuerte',
      tono: 'verde',
    })
    expect(base.secciones[0]).not.toHaveProperty('ancho')
    expect(esquemaDiseno.safeParse(d).success).toBe(true)
  })

  it('el valor por defecto, «Automático» o nulo quitan la clave: lo que no se tocó queda igual', () => {
    const con = ponerAspectoDeSeccion(base, 's', {
      ancho: 6,
      alto: 2,
      relleno: 'grande',
      tono: 'verde',
      letra: 'chica',
    })
    const sin = ponerAspectoDeSeccion(con, 's', {
      ancho: null,
      alto: 1,
      relleno: 'medio',
      separacion: 'media',
      densidad: 'comoda',
      letra: 'normal',
      enfasis: 'normal',
      tono: null,
    })
    expect(sin).toStrictEqual(base)
    // 12 columnas no es «Automática»: se escribe.
    expect(ponerAspectoDeSeccion(base, 's', { ancho: 12 }).secciones[0]).toMatchObject({
      ancho: 12,
    })
  })

  it('lo que no está en su escala no se escribe', () => {
    const d = ponerAspectoDeSeccion(base, 's', {
      ancho: 13,
      alto: 5,
      relleno: 'enorme' as never,
      tono: 'Verde',
    })
    expect(d).toStrictEqual(base)
    expect(ponerAspectoDeSeccion(base, 's', { ancho: 6.5 })).toStrictEqual(base)
  })
})

describe('ponerAspectoDeItem', () => {
  it('la celda cambia su ancho por un número (nulo no lo quita) y lleva alto, letra y énfasis', () => {
    const d = ponerAspectoDeItem(
      base,
      's',
      { tipo: 'celda', nodo: 'a' },
      { ancho: 8, alto: 2, letra: 'chica', enfasis: 'fuerte' },
    )
    expect(d.secciones[0]?.items[0]).toStrictEqual({
      tipo: 'celda',
      nodo: 'a',
      ancho: 8,
      alto: 2,
      letra: 'chica',
      enfasis: 'fuerte',
      posicion: { columna: 1, fila: 1 },
    })
    expect(
      ponerAspectoDeItem(d, 's', { tipo: 'celda', nodo: 'a' }, { ancho: null }).secciones[0]
        ?.items[0],
    ).toMatchObject({ ancho: 8 })
    expect(esquemaDiseno.safeParse(d).success).toBe(true)
  })

  it('en los demás ítems 12 columnas o nulo quitan el ancho (sin él ocupan la fila)', () => {
    const d = ponerAspectoDeItem(
      base,
      's',
      { tipo: 'interruptor', nodo: 'libre' },
      { ancho: 6, alto: 2 },
    )
    expect(d.secciones[0]?.items[1]).toMatchObject({ ancho: 6, alto: 2 })
    const sin = ponerAspectoDeItem(
      d,
      's',
      { tipo: 'interruptor', nodo: 'libre' },
      { ancho: 12, alto: null },
    )
    expect(sin).toStrictEqual(base)
    expect(
      ponerAspectoDeItem(base, 's', { tipo: 'interruptor', nodo: 'libre' }, { ancho: 'mitad' }),
    ).toStrictEqual(base)
  })
})

describe('ponerAspectoDeLaCabecera', () => {
  it('escribe y quita el aspecto de la cabecera', () => {
    const d = ponerAspectoDeLaCabecera(base, {
      tono: 'verde',
      relleno: 'grande',
      letra: 'grande',
      enfasis: 'fuerte',
    })
    expect(d.cabecera).toStrictEqual({
      ...base.cabecera,
      tono: 'verde',
      relleno: 'grande',
      letra: 'grande',
      enfasis: 'fuerte',
    })
    expect(
      ponerAspectoDeLaCabecera(d, {
        tono: null,
        relleno: 'medio',
        letra: 'normal',
        enfasis: 'normal',
      }),
    ).toStrictEqual(base)
  })
})
