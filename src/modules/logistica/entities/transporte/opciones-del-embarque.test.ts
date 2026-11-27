import { describe, expect, it } from 'vitest'
import { nombreDeCatalogo, opcionesDelEmbarque, textoDeLaRuta } from './opciones-del-embarque'

const ORIGEN = '11111111-1111-4111-8111-111111111111'
const OTRO = '22222222-2222-4222-8222-222222222222'
const fila = (id: string, nombre: string, origenId: string | null, activo = true) => ({
  id,
  nombre,
  origenId,
  activo,
  clave: nombre.toLowerCase(),
})
const MAERSK = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const MSC = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const AJENA = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'

const catalogos = {
  navieras: [fila(MAERSK, 'Maersk', null), fila(MSC, 'MSC', ORIGEN), fila(AJENA, 'Ajena', OTRO)],
  puertos: [],
}

describe('opcionesDelEmbarque', () => {
  it('lo que usa el origen: sus propios y los compartidos, nunca los de otro', () => {
    const o = opcionesDelEmbarque(catalogos, ORIGEN, {
      naviera: null,
      puertoOrigen: null,
      puertoDestino: null,
    })
    expect(o.navieras.map((n) => n.etiqueta)).toEqual(['Maersk', 'MSC'])
  })

  it('lo guardado de otro origen se ofrece rotulado', () => {
    const o = opcionesDelEmbarque(catalogos, ORIGEN, {
      naviera: AJENA,
      puertoOrigen: null,
      puertoDestino: null,
    })
    expect(o.navieras.at(-1)).toEqual({ valor: AJENA, etiqueta: 'Ajena (de otro origen)' })
  })
})

describe('los nombres de la fila', () => {
  it('el nombre del catálogo, nunca el id', () => {
    expect(nombreDeCatalogo(catalogos.navieras, MSC)).toBe('MSC')
    expect(nombreDeCatalogo(catalogos.navieras, 'otro')).toBeNull()
    expect(nombreDeCatalogo(catalogos.navieras, null)).toBeNull()
  })

  it('la ruta con lo que haya', () => {
    expect(textoDeLaRuta('Miami', 'Iquique')).toBe('Miami → Iquique')
    expect(textoDeLaRuta('Miami', null)).toBe('Miami → —')
    expect(textoDeLaRuta(null, null)).toBeNull()
  })
})
