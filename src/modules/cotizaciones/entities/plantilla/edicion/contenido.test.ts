import { describe, expect, it } from 'vitest'
import {
  MAXIMO_DE_CARACTERES_DE_UN_TEXTO,
  type DatoDeLaCelda,
  type ParteDelTexto,
} from '../../cuadricula-de-la-tarjeta'
import {
  MOTIVOS_DEL_TEXTO,
  escribirTexto,
  motivoDelContenidoDeTexto,
  motivoDelTexto,
  ponerContenido,
  vaciar,
} from './contenido'
import {
  anuncioDe,
  celda,
  celdaPorId,
  grilla,
  motivoDe,
  ocupante,
  plantillaDe,
  rect,
  texto,
} from './edicion.soporte'
import { MOTIVOS_DE_LOS_TOPES } from './limites'

const P = grilla(3, 3, [
  celda('a', 0, 0, texto('A')),
  { ...celda('b', 1, 1, texto('B')), estilo: { negrita: true } },
  { ...celda('m', 2, 0, texto('M')), abarca_columnas: 2 },
])

describe('motivoDelTexto', () => {
  it('hasta 300 caracteres (un emoji es uno) y sin «{{»', () => {
    expect(motivoDelTexto('😀'.repeat(MAXIMO_DE_CARACTERES_DE_UN_TEXTO))).toBeNull()
    expect(motivoDelTexto('x'.repeat(MAXIMO_DE_CARACTERES_DE_UN_TEXTO + 1))).toBe(
      MOTIVOS_DEL_TEXTO.largo,
    )
    expect(motivoDelTexto('Hola {{nombre}}')).toBe(MOTIVOS_DEL_TEXTO.llaves)
    expect(motivoDelTexto('=SUMA(A1)')).toBeNull()
  })
})

const PCT: DatoDeLaCelda = { tipo: 'dato', nodo: 'comision', mostrar: 'porcentaje' }

describe('motivoDelContenidoDeTexto', () => {
  it('un texto con datos suma sus partes de texto, va hasta 20 partes y ninguna lleva «{{»', () => {
    const mitad = 'x'.repeat(MAXIMO_DE_CARACTERES_DE_UN_TEXTO / 2)
    expect(motivoDelContenidoDeTexto({ tipo: 'texto', partes: [mitad, PCT, mitad] })).toBeNull()
    expect(motivoDelContenidoDeTexto({ tipo: 'texto', partes: [mitad, PCT, `${mitad}x`] })).toBe(
      MOTIVOS_DEL_TEXTO.largo,
    )
    const veintiuna: ParteDelTexto[] = [PCT]
    for (let k = 0; k < 10; k++) veintiuna.push('a', PCT)
    expect(motivoDelContenidoDeTexto({ tipo: 'texto', partes: veintiuna })).toBe(
      MOTIVOS_DEL_TEXTO.partes,
    )
    expect(motivoDelContenidoDeTexto({ tipo: 'texto', partes: ['Hola {{x}} ', PCT] })).toBe(
      MOTIVOS_DEL_TEXTO.llaves,
    )
    expect(motivoDelContenidoDeTexto({ tipo: 'texto', texto: '{{x}}' })).toBe(
      MOTIVOS_DEL_TEXTO.llaves,
    )
  })
})

describe('ponerContenido', () => {
  it('un texto con datos se pone normalizado y, sin datos, como texto fijo', () => {
    const r = ponerContenido(P, rect(0, 0), {
      tipo: 'texto',
      partes: ['Comisión ', '', 'giro ', PCT],
    })
    expect(celdaPorId(plantillaDe(r), 'a')?.contenido).toEqual({
      tipo: 'texto',
      partes: ['Comisión giro ', PCT],
    })
    const sinDatos = ponerContenido(P, rect(0, 0), { tipo: 'texto', partes: ['A'] })
    expect(sinDatos.ok && sinDatos.plantilla).toBe(P)
    expect(motivoDe(ponerContenido(P, rect(0, 0), { tipo: 'texto', partes: ['{{', PCT] }))).toBe(
      MOTIVOS_DEL_TEXTO.llaves,
    )
  })
  it('lo toman las celdas de lo elegido y las casillas vacías reciben una celda nueva', () => {
    const r = ponerContenido(P, rect(0, 0, 0, 2), { tipo: 'dato', variable: 'fecha_larga' })
    const p = plantillaDe(r)
    expect(anuncioDe(r)).toBe('Se cambió el contenido de 3 celdas.')
    expect(celdaPorId(p, 'a')?.contenido).toEqual({ tipo: 'dato', variable: 'fecha_larga' })
    expect(ocupante(p, 0, 1)).toBe('c1')
    expect(ocupante(p, 0, 2)).toBe('c2')
    expect(P.celdas).toHaveLength(3)
  })
  it('un nodo con qué mostrar, en una celda', () => {
    const r = ponerContenido(P, rect(1, 1), { tipo: 'dato', nodo: 'remate', mostrar: 'monto' })
    expect(anuncioDe(r)).toBe('Se cambió el contenido de la celda.')
    expect(celdaPorId(plantillaDe(r), 'b')).toMatchObject({ estilo: { negrita: true } })
  })
  it('un texto que no se admite no se pone', () => {
    expect(motivoDe(ponerContenido(P, rect(0, 0), texto('{{x}}')))).toBe(MOTIVOS_DEL_TEXTO.llaves)
  })
  it('«Vacío» es vaciar, y lo mismo que ya había no cambia nada', () => {
    expect(anuncioDe(ponerContenido(P, rect(0, 0), { tipo: 'vacio' }))).toBe('Se vació la celda.')
    const igual = ponerContenido(P, rect(0, 0), texto('A'))
    expect(igual.ok && igual.plantilla).toBe(P)
  })
  it('lo que pasaría de 24 KiB se rechaza', () => {
    const r = ponerContenido(grilla(10, 10), rect(0, 0, 9, 9), texto('x'.repeat(300)))
    expect(motivoDe(r)).toBe(MOTIVOS_DE_LOS_TOPES.bytes)
  })
})

describe('escribirTexto', () => {
  it('cambia el texto de la celda o crea una en la casilla vacía', () => {
    expect(
      celdaPorId(plantillaDe(escribirTexto(P, { f: 0, k: 0 }, 'Hola')), 'a')?.contenido,
    ).toEqual(texto('Hola'))
    const r = escribirTexto(P, { f: 2, k: 2 }, 'Nueva')
    expect(anuncioDe(r)).toBe('Se escribió en la celda.')
    expect(ocupante(plantillaDe(r), 2, 2)).toBe('c1')
  })
  it('en una casilla cubierta escribe en la celda combinada', () => {
    const p = plantillaDe(escribirTexto(P, { f: 2, k: 1 }, 'Combinada'))
    expect(celdaPorId(p, 'm')?.contenido).toEqual(texto('Combinada'))
    expect(p.celdas).toHaveLength(3)
  })
  it('un texto vacío vacía la celda; el mismo texto no cambia nada; fuera de la grilla, no', () => {
    expect(ocupante(plantillaDe(escribirTexto(P, { f: 0, k: 0 }, '')), 0, 0)).toBeNull()
    const igual = escribirTexto(P, { f: 0, k: 0 }, 'A')
    expect(igual.ok && igual.plantilla).toBe(P)
    expect(motivoDe(escribirTexto(P, { f: 5, k: 0 }, 'x'))).toBe('Esa celda no está en la tarjeta.')
    expect(motivoDe(escribirTexto(P, { f: 0, k: 0 }, 'x'.repeat(301)))).toBe(
      MOTIVOS_DEL_TEXTO.largo,
    )
  })
})

describe('vaciar', () => {
  it('quita entera la celda sin estilo ni combinación y deja vacía la que tiene', () => {
    const r = vaciar(P, rect(0, 0, 2, 2))
    const p = plantillaDe(r)
    expect(anuncioDe(r)).toBe('Se vaciaron 3 celdas.')
    expect(celdaPorId(p, 'a')).toBeUndefined()
    expect(celdaPorId(p, 'b')).toMatchObject({
      contenido: { tipo: 'vacio' },
      estilo: { negrita: true },
    })
    expect(celdaPorId(p, 'm')).toMatchObject({ contenido: { tipo: 'vacio' }, abarca_columnas: 2 })
  })
  it('sin nada que vaciar devuelve la misma plantilla', () => {
    const r = vaciar(P, rect(0, 2))
    expect(r).toEqual({ ok: true, plantilla: P, anuncio: 'No había nada que vaciar.' })
    expect(r.ok && r.plantilla).toBe(P)
  })
})
