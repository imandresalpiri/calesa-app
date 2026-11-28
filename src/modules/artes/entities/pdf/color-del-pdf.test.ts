import { describe, expect, it } from 'vitest'
import { pinturaDe, pinturaOpcional } from './color-del-pdf'

describe('pinturaDe', () => {
  it('separa el alfa de un #rrggbbaa y lo multiplica por la opacidad de la capa', () => {
    expect(pinturaDe('#FF000080', 0.5)).toEqual({ color: '#ff0000', opacidad: (128 / 255) * 0.5 })
  })

  it('un #rrggbb es opaco', () => {
    expect(pinturaDe('#112233')).toEqual({ color: '#112233', opacidad: 1 })
  })

  it('sin color, nada', () => {
    expect(pinturaOpcional(null, 0.4)).toBeNull()
    expect(pinturaOpcional('#00000000')).toEqual({ color: '#000000', opacidad: 0 })
  })
})
