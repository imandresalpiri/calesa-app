import { describe, expect, it } from 'vitest'
import { estadoDeUnaPieza, textoDelEstado, tonoDelEstado } from './estado-de-la-edicion'

describe('el estado de la edición', () => {
  it('dice cada estado con su tono', () => {
    expect(textoDelEstado({ tipo: 'cambios' })).toBe('Cambios sin guardar')
    expect(textoDelEstado({ tipo: 'borrador' })).toBe('Borrador')
    expect(textoDelEstado({ tipo: 'publicada', version: 3 })).toBe('Publicada v3')
    expect(textoDelEstado({ tipo: 'publicada' })).toBe('Publicada')
    expect(tonoDelEstado({ tipo: 'cambios' })).toBe('aviso')
    expect(tonoDelEstado({ tipo: 'borrador' })).toBe('neutro')
    expect(tonoDelEstado({ tipo: 'publicada', version: 1 })).toBe('exito')
  })

  it('lo no guardado manda sobre el borrador y éste sobre la publicada', () => {
    const base = { borrador: { detalle: 'Ana' }, publicada: { version: 2 } }
    expect(estadoDeUnaPieza({ hayCambios: true, ...base })).toEqual({ tipo: 'cambios' })
    expect(estadoDeUnaPieza({ hayCambios: false, ...base })).toEqual({
      tipo: 'borrador',
      detalle: 'Ana',
    })
    expect(
      estadoDeUnaPieza({ hayCambios: false, borrador: null, publicada: { version: 2 } }),
    ).toEqual({ tipo: 'publicada', version: 2 })
    expect(estadoDeUnaPieza({ hayCambios: false, borrador: null, publicada: null })).toBeNull()
  })
})
