import { describe, expect, it } from 'vitest'
import type { DatoDeLaCelda, ParteDelTexto } from '../../cuadricula-de-la-tarjeta'
import {
  cambiarDato,
  contenidoDeLasPartes,
  datoJuntoAlCursor,
  insertarDato,
  insertarTexto,
  largoEnUnidades,
  MOTIVO_DE_LAS_PARTES,
  motivoParaInsertar,
  normalizarPartes,
  partesDe,
  quitarParte,
  reemplazarConTexto,
  seEscribeEnElLugar,
} from './texto-con-datos'

const PCT: DatoDeLaCelda = { tipo: 'dato', nodo: 'transferencia', mostrar: 'porcentaje' }
const CLIENTE: DatoDeLaCelda = { tipo: 'dato', variable: 'cliente_nombre' }

describe('el modelo del texto con datos', () => {
  it('lee las partes de un texto fijo y de uno con datos', () => {
    expect(partesDe({ tipo: 'texto', texto: '' })).toEqual([])
    expect(partesDe({ tipo: 'texto', texto: 'Hola' })).toEqual(['Hola'])
    expect(partesDe({ tipo: 'texto', partes: ['Hola ', CLIENTE] })).toEqual(['Hola ', CLIENTE])
  })

  it('normaliza: junta los textos seguidos y quita los vacíos', () => {
    expect(normalizarPartes(['a', '', 'b', PCT, '', 'c', 'd'])).toEqual(['ab', PCT, 'cd'])
    expect(normalizarPartes([PCT, PCT])).toEqual([PCT, PCT])
  })

  it('sin datos escribe un texto fijo; con datos, las partes normalizadas', () => {
    expect(contenidoDeLasPartes([])).toEqual({ tipo: 'texto', texto: '' })
    expect(contenidoDeLasPartes(['a', 'b'])).toEqual({ tipo: 'texto', texto: 'ab' })
    expect(contenidoDeLasPartes(['Comisión ', '', 'giro ', PCT])).toEqual({
      tipo: 'texto',
      partes: ['Comisión giro ', PCT],
    })
  })

  it('cuenta cada unidad de un texto y cada dato como uno', () => {
    expect(largoEnUnidades(['ab', PCT, '🚗'])).toBe(5)
  })

  it('inserta un dato en medio de un texto, al principio y al final', () => {
    expect(insertarDato(['Comisión giro'], 8, PCT)).toEqual({
      partes: ['Comisión', PCT, ' giro'],
      pos: 9,
    })
    expect(insertarDato(['giro'], 0, PCT)).toEqual({ partes: [PCT, 'giro'], pos: 1 })
    expect(insertarDato(['giro '], 5, PCT)).toEqual({ partes: ['giro ', PCT], pos: 6 })
    expect(insertarDato([], 0, PCT)).toEqual({ partes: [PCT], pos: 1 })
  })
})

describe('editar el texto con datos', () => {
  it('insertar un dato sobre lo elegido lo reemplaza', () => {
    expect(insertarDato(['Hola XX chau'], 5, CLIENTE, 7)).toEqual({
      partes: ['Hola ', CLIENTE, ' chau'],
      pos: 6,
    })
  })

  it('escribe y pega en el cursor, también un salto de línea, y junta con el texto vecino', () => {
    expect(insertarTexto(['Comisión ', PCT], 9, 'giro ')).toEqual({
      partes: ['Comisión giro ', PCT],
      pos: 14,
    })
    expect(insertarTexto([PCT], 1, '\n')).toEqual({ partes: [PCT, '\n'], pos: 2 })
    expect(reemplazarConTexto(['ab', PCT, 'cd'], 1, 4, 'X')).toEqual({ partes: ['aXd'], pos: 2 })
  })

  it('encuentra la pastilla junto al cursor', () => {
    const partes: ParteDelTexto[] = ['ab', PCT, 'c']
    expect(datoJuntoAlCursor(partes, 3, 'antes')).toBe(1)
    expect(datoJuntoAlCursor(partes, 2, 'despues')).toBe(1)
    expect(datoJuntoAlCursor(partes, 2, 'antes')).toBeNull()
    expect(datoJuntoAlCursor(partes, 3, 'despues')).toBeNull()
    expect(datoJuntoAlCursor(partes, 0, 'antes')).toBeNull()
    expect(datoJuntoAlCursor(partes, 4, 'despues')).toBeNull()
  })

  it('Retroceso o Supr junto a una pastilla la quita entera y junta los textos', () => {
    const partes: ParteDelTexto[] = ['Comisión ', PCT, ' giro']
    const antes = datoJuntoAlCursor(partes, 10, 'antes')
    expect(antes).toBe(1)
    expect(quitarParte(partes, 1)).toEqual({ partes: ['Comisión  giro'], pos: 9 })
    expect(datoJuntoAlCursor(partes, 9, 'despues')).toBe(1)
  })

  it('cambia el dato de una pastilla sin tocar lo demás', () => {
    expect(cambiarDato(['Hola ', CLIENTE], 1, PCT)).toEqual(['Hola ', PCT])
    expect(cambiarDato(['Hola ', CLIENTE], 0, PCT)).toEqual(['Hola ', CLIENTE])
  })

  it('apaga «Insertar dato» si pasaría de 20 partes (en medio de un texto suma dos)', () => {
    const diecinueve: ParteDelTexto[] = []
    for (let k = 0; k < 9; k++) diecinueve.push(`t${String(k)}`, PCT)
    diecinueve.push('fin')
    expect(diecinueve).toHaveLength(19)
    const largo = largoEnUnidades(diecinueve)
    expect(motivoParaInsertar(diecinueve, largo)).toBeNull()
    expect(motivoParaInsertar(diecinueve, largo - 1)).toBe(MOTIVO_DE_LAS_PARTES)
    expect(motivoParaInsertar([...diecinueve, PCT], largo + 1)).toBe(MOTIVO_DE_LAS_PARTES)
  })

  it('sólo un texto fijo, una celda vacía o ninguna se escriben en el lugar', () => {
    expect(seEscribeEnElLugar(undefined)).toBe(true)
    expect(seEscribeEnElLugar({ tipo: 'vacio' })).toBe(true)
    expect(seEscribeEnElLugar({ tipo: 'texto', texto: 'x' })).toBe(true)
    expect(seEscribeEnElLugar({ tipo: 'texto', partes: [PCT] })).toBe(false)
    expect(seEscribeEnElLugar(CLIENTE)).toBe(false)
  })
})
