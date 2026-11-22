import { describe, expect, it } from 'vitest'
import type { DatoClave } from './datos-clave'
import {
  datoDeLlave,
  llaveDeDatoClave,
  moverDatoClaveA,
  ponerDatoClave,
} from './datos-clave-edicion'

const anio: DatoClave = { comun: 'anio' }
const vin: DatoClave = { comun: 'vin' }
const marca: DatoClave = { comun: 'marca' }
const color: DatoClave = { campo: 'color' }
const cuatro: DatoClave[] = [anio, vin, marca, { comun: 'modelo' }]

describe('ponerDatoClave', () => {
  it('uno nuevo entra en ese lugar y corre a los demás', () => {
    expect(ponerDatoClave([anio, vin], color, 0)).toEqual([color, anio, vin])
    expect(ponerDatoClave([anio, vin], color, 1)).toEqual([anio, color, vin])
  })

  it('nunca más allá del último ni antes del primero', () => {
    expect(ponerDatoClave([anio], color, 3)).toEqual([anio, color])
    expect(ponerDatoClave([anio], color, -2)).toEqual([color, anio])
    expect(ponerDatoClave([anio, vin, marca], anio, 9)).toEqual([vin, marca, anio])
    expect(ponerDatoClave([anio, vin, marca], marca, -1)).toEqual([marca, anio, vin])
  })

  it('con 4, uno nuevo no reemplaza a nadie', () => {
    expect(ponerDatoClave(cuatro, color, 1)).toEqual(cuatro)
  })

  it('uno que ya está cambia de lugar, aunque haya 4', () => {
    expect(ponerDatoClave(cuatro, marca, 0)).toEqual([marca, anio, vin, { comun: 'modelo' }])
  })

  it('un común y un campo con la misma clave son distintos', () => {
    expect(ponerDatoClave([vin], { campo: 'vin' }, 0)).toEqual([{ campo: 'vin' }, vin])
  })
})

describe('moverDatoClaveA', () => {
  it('lo lleva de un lugar a otro y corre al resto', () => {
    expect(moverDatoClaveA([anio, vin, color], 0, 2)).toEqual([vin, color, anio])
    expect(moverDatoClaveA([anio, vin, color], 2, 0)).toEqual([color, anio, vin])
    expect(moverDatoClaveA([anio, vin, color], 1, 1)).toEqual([anio, vin, color])
  })

  it('fuera de la lista queda igual', () => {
    expect(moverDatoClaveA([anio, vin], 0, 2)).toEqual([anio, vin])
    expect(moverDatoClaveA([anio, vin], 5, 0)).toEqual([anio, vin])
    expect(moverDatoClaveA([anio, vin], 1, -1)).toEqual([anio, vin])
    expect(moverDatoClaveA([anio, vin, color], -1, 0)).toEqual([anio, vin, color])
  })
})

describe('la llave de un dato clave', () => {
  it('va y vuelve', () => {
    expect(llaveDeDatoClave(anio)).toBe('comun:anio')
    expect(llaveDeDatoClave(color)).toBe('campo:color')
    expect(datoDeLlave('comun:anio')).toEqual(anio)
    expect(datoDeLlave('campo:color')).toEqual(color)
  })

  it('un común que no existe, un campo sin clave o una llave ajena son null', () => {
    expect(datoDeLlave('comun:no_existe')).toBeNull()
    expect(datoDeLlave('campo:')).toBeNull()
    expect(datoDeLlave('otra:cosa')).toBeNull()
  })
})
