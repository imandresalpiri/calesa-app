import { describe, expect, it } from 'vitest'
import { grupoDelLote, textoDelGrupoQueNoEsta } from './claves-del-lote'

const ID = '6a1f5d3e-8c2b-4a7e-9f10-2b3c4d5e6f70'

describe('grupoDelLote', () => {
  it('sin contenedor ni embarque no hay grupo', () => {
    expect(grupoDelLote(null, null)).toBeNull()
  })

  it('el contenedor manda sobre el embarque', () => {
    expect(grupoDelLote(ID, 'x')).toEqual({ tipo: 'contenedor', id: ID, valido: true })
    expect(grupoDelLote(null, ID)).toEqual({ tipo: 'embarque', id: ID, valido: true })
  })

  it('una URL vieja, con el número en vez del id, no se lee', () => {
    expect(grupoDelLote('MSCU1234', null)).toEqual({ tipo: 'contenedor', valido: false })
    expect(textoDelGrupoQueNoEsta('contenedor')).toBe('Ese contenedor no existe o ya no lo ves.')
  })
})
