import { describe, expect, it } from 'vitest'
import { marcoEnElCursor } from './autocompletar'
import { firmaEnElCursor, firmaEnTexto } from './firma-en-el-cursor'

// La pieza resaltada de la firma con el cursor al final del texto.
const actual = (texto: string) =>
  firmaEnElCursor(texto, texto.length)?.piezas.find((p) => p.actual)?.texto ?? null

describe('firmaEnElCursor', () => {
  it('dentro de SI(, resalta la condición', () => {
    const firma = firmaEnElCursor('=SI(', 4)
    expect(firma?.nombre).toBe('SI')
    expect(firma?.piezas).toEqual([
      { texto: 'condición', actual: true },
      { texto: 'si se cumple', actual: false },
      { texto: 'si no', actual: false },
    ])
  })

  it('en el 2.º valor, resalta «si se cumple»; en el 3.º, «si no»', () => {
    expect(actual('=SI(C3>0; ')).toBe('si se cumple')
    expect(actual('=SI(C3>0; C5; 0')).toBe('si no')
  })

  it('con el cursor en el medio, mira lo que hay antes de él', () => {
    expect(firmaEnElCursor('=SI(C3>0; C5; 0)', 5)?.piezas[0]?.actual).toBe(true)
  })

  it('anidada, gana la de adentro; al cerrarla, vuelve la de afuera', () => {
    expect(firmaEnElCursor('=SI(Y(C2>1; ', 12)?.nombre).toBe('Y')
    expect(actual('=SI(Y(C2>1; ')).toBe('condición')
    expect(firmaEnElCursor('=SI(Y(C2>1; C3>0); ', 19)?.nombre).toBe('SI')
    expect(actual('=SI(Y(C2>1; C3>0); ')).toBe('si se cumple')
  })

  it('pasado el último valor de una que repite, resalta el último; el «…» nunca', () => {
    expect(actual('=SUMA(C1; C2; C3; ')).toBe('valor')
    const firma = firmaEnElCursor('=SUMA(C1; C2; C3; ', 18)
    expect(firma?.piezas.map((p) => p.actual)).toEqual([false, true, false])
    expect(firma?.piezas.at(-1)?.texto).toBe('…')
  })

  it('con un valor de más en una que no repite, nada resaltado', () => {
    expect(actual('=REDONDEAR(C9; 0; ')).toBeNull()
    expect(firmaEnElCursor('=REDONDEAR(C9; 0; ', 18)?.nombre).toBe('REDONDEAR')
  })

  it('fuera de toda función, en una desconocida o sin «=», nula', () => {
    expect(firmaEnElCursor('=C5+C7', 6)).toBeNull()
    expect(firmaEnElCursor('=SI(C3>0; C5; 0)', 16)).toBeNull()
    expect(firmaEnElCursor('=NOEXISTE(', 10)).toBeNull()
    expect(firmaEnElCursor('SI(', 3)).toBeNull()
    expect(firmaEnElCursor('', 0)).toBeNull()
  })

  it('en minúsculas también', () => {
    expect(firmaEnElCursor('=si(', 4)?.nombre).toBe('SI')
  })

  it('como texto, la firma de la ayuda', () => {
    const firma = firmaEnElCursor('=SUMA(', 6)
    expect(firma && firmaEnTexto(firma)).toBe('SUMA(valor; valor; …)')
  })
})

describe('marcoEnElCursor', () => {
  it('dice la función y el valor donde está el cursor', () => {
    expect(marcoEnElCursor('=BUSCARV(C2; "fl', 16)).toMatchObject({ fn: 'BUSCARV', arg: 1 })
    expect(marcoEnElCursor('=C5', 3)).toBeNull()
  })
})
