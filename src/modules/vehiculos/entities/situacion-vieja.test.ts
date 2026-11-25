import { describe, expect, it } from 'vitest'
import { conSituacionTraducida } from './situacion-vieja'

const ORIGEN = '00000000-0000-4000-8000-0000000000a1'

describe('conSituacionTraducida', () => {
  it('lee una vista vieja con las claves nuevas, sin el cursor', () => {
    const vista = {
      id: 'v1',
      nombre: 'Perdidas',
      params: { origen: ORIGEN, situacion: 'no_ganada', cursor: 'x' },
    }
    expect(conSituacionTraducida(vista)).toEqual({
      id: 'v1',
      nombre: 'Perdidas',
      params: { origen: ORIGEN, subasta: 'no_ganadas' },
    })
  })

  it('una vista sin «situacion» queda igual (la misma)', () => {
    const vista = { params: { origen: ORIGEN, subasta: 'vivas' } }
    expect(conSituacionTraducida(vista)).toBe(vista)
  })
})
