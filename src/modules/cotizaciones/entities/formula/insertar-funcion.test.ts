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
    expect(insertarFuncion('=', -3, 'Y')).toEqual({ texto: 'Y()=', cursor: 2 })
  })
})
