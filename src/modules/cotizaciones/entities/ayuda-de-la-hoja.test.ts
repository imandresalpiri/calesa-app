import { describe, expect, it } from 'vitest'
import { ayudaDeLaHoja } from './ayuda-de-la-hoja'

describe('ayudaDeLaHoja: lo que manda la base, con nulo donde no vino una clave', () => {
  it('sin ayuda, nulo', () => {
    expect(ayudaDeLaHoja(undefined)).toBeNull()
  })

  it('los bloques de título, texto y enlaces pasan tal cual, en su orden', () => {
    const crudo = [
      { tipo: 'titulo' as const, texto: 'Cómo se calcula' },
      { tipo: 'texto' as const, texto: 'Mira **esto**' },
      { tipo: 'enlaces' as const, enlaces: [{ titulo: 'Aduana', url: 'https://aduana.gob.bo' }] },
    ]
    expect(ayudaDeLaHoja(crudo)).toEqual(crudo)
  })

  it('una tabla sin columnas, sin resaltar, sin casa ni id: todo nulo o falso', () => {
    expect(ayudaDeLaHoja([{ tipo: 'tabla', tabla: 'fletes' }])).toEqual([
      { tipo: 'tabla', tabla: 'fletes', columnas: null, resaltar: false, casa: null, id: null },
    ])
  })

  it('una tabla con todo: la columna que no llena queda con `llena` nulo', () => {
    const id = '7d0c1b8e-4c1f-4d34-9a51-2f1f7f3b8e10'
    expect(
      ayudaDeLaHoja([
        {
          tipo: 'tabla',
          tabla: 'fletes',
          columnas: [{ columna: 'zona' }, { columna: 'monto', llena: 'flete' }],
          resaltar: true,
          casa: [
            { columna: 'zona', nodo: 'zona' },
            { columna: 'anio', campo: 'anio' },
          ],
          id,
        },
      ]),
    ).toEqual([
      {
        tipo: 'tabla',
        tabla: 'fletes',
        columnas: [
          { columna: 'zona', llena: null },
          { columna: 'monto', llena: 'flete' },
        ],
        resaltar: true,
        casa: [
          { columna: 'zona', nodo: 'zona' },
          { columna: 'anio', campo: 'anio' },
        ],
        id,
      },
    ])
  })
})
