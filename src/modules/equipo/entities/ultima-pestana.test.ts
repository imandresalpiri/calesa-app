import { describe, expect, it } from 'vitest'
import { PARTES_DEL_ORIGEN } from '@/shared/lib/rutas'
import {
  TOPE_DE_PESTANAS_RECORDADAS,
  conLaPestana,
  type PestanasRecordadas,
  esquemaRecordarPestana,
  pestanasRecordadasDesde,
} from './ultima-pestana'

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const [primera = 'campos', segunda = 'campos'] = PARTES_DEL_ORIGEN

describe('pestanasRecordadasDesde', () => {
  it('lee las entradas buenas y descarta las malas', () => {
    expect(
      pestanasRecordadasDesde({
        [id(1)]: primera,
        'no-es-id': primera,
        [id(2)]: 'ya-no-existe',
        [id(3)]: 4,
      }),
    ).toEqual({ [id(1)]: primera })
  })

  it('lo que no es un objeto es nada', () => {
    expect(pestanasRecordadasDesde(null)).toEqual({})
    expect(pestanasRecordadasDesde('fases')).toEqual({})
    expect(pestanasRecordadasDesde([primera])).toEqual({})
  })
})

describe('conLaPestana', () => {
  it('pone el origen al final con su pestaña nueva', () => {
    const previas: PestanasRecordadas = { [id(1)]: primera, [id(2)]: primera }
    const nuevas = conLaPestana(previas, id(1), segunda)
    expect(Object.keys(nuevas)).toEqual([id(2), id(1)])
    expect(nuevas[id(1)]).toBe(segunda)
  })

  it('olvida los más viejos pasado el tope', () => {
    let recordadas = {}
    for (let n = 1; n <= TOPE_DE_PESTANAS_RECORDADAS + 2; n++) {
      recordadas = conLaPestana(recordadas, id(n), primera)
    }
    const claves = Object.keys(recordadas)
    expect(claves).toHaveLength(TOPE_DE_PESTANAS_RECORDADAS)
    expect(claves[0]).toBe(id(3))
    expect(claves.at(-1)).toBe(id(TOPE_DE_PESTANAS_RECORDADAS + 2))
  })
})

describe('esquemaRecordarPestana', () => {
  it('pide un id y una pestaña del origen', () => {
    expect(esquemaRecordarPestana.safeParse({ origenId: id(1), parte: primera }).success).toBe(true)
    expect(esquemaRecordarPestana.safeParse({ origenId: 'x', parte: primera }).success).toBe(false)
    expect(esquemaRecordarPestana.safeParse({ origenId: id(1), parte: 'otra' }).success).toBe(false)
  })
})
