import { describe, expect, it } from 'vitest'
import { insertarFuncion } from './insertar-funcion'

describe('insertarFuncion', () => {
  it('con el texto vacío, la fórmula entera con el cursor entre los paréntesis', () => {
    expect(insertarFuncion('', 0, 'SUMA')).toEqual({ texto: '=SUMA()', cursor: 6 })
  })

  it('sin «=», lo escrito queda adentro (la cifra de un valor fijo no se pierde)', () => {
    expect(insertarFuncion(' 100 ', 3, 'MAX')).toEqual({ texto: '=MAX(100)', cursor: 8 })
  })

  it('con una fórmula, la función en el cursor', () => {
    expect(insertarFuncion('=C2+', 4, 'SUMA')).toEqual({ texto: '=C2+SUMA()', cursor: 9 })
    expect(insertarFuncion('=C2+C3', 1, 'SI')).toEqual({ texto: '=SI()C2+C3', cursor: 4 })
  })

  it('un cursor fuera del texto se lleva al borde', () => {
    expect(insertarFuncion('=C2+', 99, 'O')).toEqual({ texto: '=C2+O()', cursor: 6 })
    expect(insertarFuncion('=', -3, 'Y')).toEqual({ texto: '=Y()', cursor: 3 })
  })

  it('nunca antes del «=»: con el cursor al principio, la función va justo después', () => {
    expect(insertarFuncion('=C2+C3', 0, 'SUMA')).toEqual({ texto: '=SUMA()C2+C3', cursor: 6 })
    expect(insertarFuncion('  =C2', 1, 'SI')).toEqual({ texto: '  =SI()C2', cursor: 6 })
  })

  it('un valor fijo en % se escribe en puntos: al envolverlo lleva su «%» y no cambia de valor', () => {
    expect(insertarFuncion('10', 2, 'SUMA', true)).toEqual({ texto: '=SUMA(10%)', cursor: 9 })
    expect(insertarFuncion('', 0, 'SUMA', true)).toEqual({ texto: '=SUMA()', cursor: 6 })
    expect(insertarFuncion('=C2', 3, 'SUMA', true)).toEqual({ texto: '=C2SUMA()', cursor: 8 })
  })
})
