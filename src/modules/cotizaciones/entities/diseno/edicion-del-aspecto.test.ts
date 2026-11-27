import { describe, expect, it } from 'vitest'
import { esquemaDiseno } from '../diseno'
import { celda, disenoDe, seccion } from './diseno-de-prueba.soporte'
import {
  escribirTamanoDelItem,
  escribirTamanoDeSeccion,
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
      relleno: 'chico',
      separacion: 'grande',
      densidad: 'compacta',
      letra: 'grande',
      enfasis: 'fuerte',
      tono: 'verde',
    })
    expect(d.secciones[0]).toMatchObject({
      relleno: 'chico',
      separacion: 'grande',
      densidad: 'compacta',
      letra: 'grande',
      enfasis: 'fuerte',
      tono: 'verde',
    })
    expect(base.secciones[0]).not.toHaveProperty('relleno')
    expect(esquemaDiseno.safeParse(d).success).toBe(true)
  })

  it('el valor por defecto o nulo quitan la clave: lo que no se tocó queda igual', () => {
    const con = ponerAspectoDeSeccion(base, 's', {
      relleno: 'grande',
      tono: 'verde',
      letra: 'chica',
    })
    const sin = ponerAspectoDeSeccion(con, 's', {
      relleno: 'medio',
      separacion: 'media',
      densidad: 'comoda',
      letra: 'normal',
      enfasis: 'normal',
      tono: null,
    })
    expect(sin).toStrictEqual(base)
  })

  it('lo que no está en su escala no se escribe, y el tamaño no es del aspecto', () => {
    const d = ponerAspectoDeSeccion(base, 's', { relleno: 'enorme' as never, tono: 'Verde' })
    expect(d).toStrictEqual(base)
    // El ancho y el alto los escribe `ponerTamano()`, que revisa que entre: aunque lleguen acá, no se escriben.
    expect(ponerAspectoDeSeccion(base, 's', { ancho: 12, alto: 3 } as never)).toStrictEqual(base)
  })
})

describe('escribirTamanoDeSeccion', () => {
  it('escribe el ancho y el alto; «Automático» (nulo) y 1 fila los quitan; 12 columnas se escribe', () => {
    const d = escribirTamanoDeSeccion(base, 's', { ancho: 8, alto: 3 })
    expect(d.secciones[0]).toMatchObject({ ancho: 8, alto: 3 })
    expect(esquemaDiseno.safeParse(d).success).toBe(true)
    expect(escribirTamanoDeSeccion(d, 's', { ancho: null, alto: 1 })).toStrictEqual(base)
    // 12 columnas no es «Automática»: se escribe.
    expect(escribirTamanoDeSeccion(base, 's', { ancho: 12 }).secciones[0]).toMatchObject({
      ancho: 12,
    })
  })

  it('lo que no es un entero de la rejilla no se escribe', () => {
    expect(escribirTamanoDeSeccion(base, 's', { ancho: 13, alto: 5.5 })).toStrictEqual(base)
    expect(escribirTamanoDeSeccion(base, 's', { ancho: 6.5 })).toStrictEqual(base)
  })
})

describe('ponerAspectoDeItem', () => {
  it('escribe la letra y el énfasis, y el tamaño no es del aspecto', () => {
    const d = ponerAspectoDeItem(
      base,
      's',
      { tipo: 'celda', nodo: 'a' },
      { letra: 'chica', enfasis: 'fuerte' },
    )
    expect(d.secciones[0]?.items[0]).toMatchObject({
      letra: 'chica',
      enfasis: 'fuerte',
      ancho: 'mitad',
    })
    expect(esquemaDiseno.safeParse(d).success).toBe(true)
    expect(
      ponerAspectoDeItem(base, 's', { tipo: 'celda', nodo: 'a' }, { ancho: 8, alto: 2 } as never),
    ).toStrictEqual(base)
  })
})

describe('escribirTamanoDelItem', () => {
  it('la celda cambia su ancho por un número (nulo no lo quita) y lleva alto', () => {
    const d = escribirTamanoDelItem(base, 's', { tipo: 'celda', nodo: 'a' }, { ancho: 8, alto: 2 })
    expect(d.secciones[0]?.items[0]).toStrictEqual({
      tipo: 'celda',
      nodo: 'a',
      ancho: 8,
      alto: 2,
      posicion: { columna: 1, fila: 1 },
    })
    expect(
      escribirTamanoDelItem(d, 's', { tipo: 'celda', nodo: 'a' }, { ancho: null }).secciones[0]
        ?.items[0],
    ).toMatchObject({ ancho: 8 })
    expect(esquemaDiseno.safeParse(d).success).toBe(true)
  })

  it('en los demás ítems 12 columnas o nulo quitan el ancho (sin él ocupan la fila)', () => {
    const interruptor = { tipo: 'interruptor', nodo: 'libre' } as const
    const d = escribirTamanoDelItem(base, 's', interruptor, { ancho: 6, alto: 2 })
    expect(d.secciones[0]?.items[1]).toMatchObject({ ancho: 6, alto: 2 })
    expect(escribirTamanoDelItem(d, 's', interruptor, { ancho: 12, alto: null })).toStrictEqual(
      base,
    )
    expect(escribirTamanoDelItem(base, 's', interruptor, { ancho: 'mitad' })).toStrictEqual(base)
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
