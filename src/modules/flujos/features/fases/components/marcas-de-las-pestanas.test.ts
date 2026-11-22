import { describe, expect, it } from 'vitest'
import { SIN_MARCAS, firmaDeLasMarcas, marcaDeLaPestana } from './marcas-de-las-pestanas'

describe('marcas de las pestañas', () => {
  it('sin marcas no hay punto', () => {
    expect(marcaDeLaPestana(SIN_MARCAS, 'identidad')).toBeUndefined()
  })

  it('un error gana sobre un cambio sin guardar', () => {
    const marcas = { conError: ['identidad'], conCambios: ['identidad', 'ajustes'] } as const
    expect(marcaDeLaPestana(marcas, 'identidad')).toEqual({ texto: 'con errores', tono: 'peligro' })
    expect(marcaDeLaPestana(marcas, 'ajustes')).toEqual({
      texto: 'con cambios sin guardar',
      tono: 'info',
    })
    expect(marcaDeLaPestana(marcas, 'reglas')).toBeUndefined()
  })

  it('la firma cambia con las marcas', () => {
    expect(firmaDeLasMarcas(SIN_MARCAS)).not.toBe(
      firmaDeLasMarcas({ conError: [], conCambios: ['ajustes'] }),
    )
    expect(firmaDeLasMarcas({ conError: ['ajustes'], conCambios: [] })).not.toBe(
      firmaDeLasMarcas({ conError: [], conCambios: ['ajustes'] }),
    )
  })
})
