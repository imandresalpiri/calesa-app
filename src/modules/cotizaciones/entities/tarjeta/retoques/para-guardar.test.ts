import { describe, expect, it } from 'vitest'
import { mismosRetoques, retoquesParaGuardar } from './para-guardar'
import type { PlantillaEnCuadricula } from '../../cuadricula-de-la-tarjeta'
import { CUADRICULA_DE_RETOQUES as P } from './retoques.soporte'

const SIN = new Map<string, string>()

// La de los retoques con «Hola» como texto con datos: «Hola » + el nombre del cliente.
const CON_DATOS: PlantillaEnCuadricula = {
  ...P,
  celdas: P.celdas.map((c) =>
    c.id === 'c_saludo'
      ? {
          ...c,
          contenido: {
            tipo: 'texto',
            partes: ['Hola ', { tipo: 'dato', variable: 'cliente_nombre' }],
          },
        }
      : c,
  ),
}

describe('retoquesParaGuardar', () => {
  it('deja sólo lo que aplica y quita los textos iguales al de la plantilla', () => {
    expect(
      retoquesParaGuardar(
        {
          celdas: { c_saludo: 'Hola', constructor: 'Chau', c_monto: 'x', c_otra: 'y' },
          filas_ocultas: ['f_otra'],
        },
        P,
        SIN,
      ),
    ).toEqual({ celdas: { constructor: 'Chau' } })
  })

  it('ordena las filas como la plantilla, sin repetir, y las celdas en orden C', () => {
    expect(
      retoquesParaGuardar(
        {
          celdas: { constructor: 'B', c_saludo: 'A' },
          filas_ocultas: ['constructor', 'f_titulo', 'constructor'],
        },
        P,
        SIN,
      ),
    ).toEqual({
      celdas: { c_saludo: 'A', constructor: 'B' },
      filas_ocultas: ['f_titulo', 'constructor'],
    })
  })

  it('sin nada que guardar, nulo', () => {
    expect(retoquesParaGuardar(null, P, SIN)).toBeNull()
    expect(retoquesParaGuardar({}, P, SIN)).toBeNull()
    expect(
      retoquesParaGuardar({ celdas: { c_saludo: 'Hola' }, filas_ocultas: [] }, P, SIN),
    ).toBeNull()
  })

  it('un texto con datos se compara con su texto resuelto: igual no es un retoque', () => {
    const resueltos = new Map([['c_saludo', 'Hola Ana']])
    expect(
      retoquesParaGuardar({ celdas: { c_saludo: 'Hola Ana' } }, CON_DATOS, resueltos),
    ).toBeNull()
    expect(
      retoquesParaGuardar({ celdas: { c_saludo: 'Hola, Ana' } }, CON_DATOS, resueltos),
    ).toEqual({ celdas: { c_saludo: 'Hola, Ana' } })
  })

  it('sin su texto resuelto, todo texto de un texto con datos cuenta como retoque', () => {
    expect(retoquesParaGuardar({ celdas: { c_saludo: 'Hola Ana' } }, CON_DATOS, SIN)).toEqual({
      celdas: { c_saludo: 'Hola Ana' },
    })
  })
})

describe('mismosRetoques', () => {
  it('compara la forma canónica: el orden de las celdas no cuenta; nulo y vacío son lo mismo', () => {
    expect(mismosRetoques({ celdas: { a: '1', b: '2' } }, { celdas: { b: '2', a: '1' } })).toBe(
      true,
    )
    expect(mismosRetoques(null, {})).toBe(true)
    expect(mismosRetoques(null, { celdas: {}, filas_ocultas: [] })).toBe(true)
    expect(mismosRetoques({ celdas: { a: '1' } }, { celdas: { a: '2' } })).toBe(false)
    expect(mismosRetoques({ filas_ocultas: ['a'] }, null)).toBe(false)
  })
})
