import { describe, expect, it } from 'vitest'
import { MAXIMO_DE_ITEMS_DEL_DISENO, nodoDelItem, type Diseno } from '../diseno'
import { celda, disenoDe, seccion } from './diseno-de-prueba.soporte'
import {
  hayLugarParaOtraPieza,
  MOTIVO_DE_LA_ULTIMA_SECCION,
  motivoDeLaSeccionVacia,
  piezasDelDiseno,
  quitarItem,
  quitarSeccion,
  seccionVacia,
  sumarItem,
  sumarSeccion,
} from './insercion-del-diseno'

const base = Object.freeze(
  disenoDe([seccion('a', [celda('a'), celda('b')]), seccion('b', [celda('c')])]),
)
const nodos = (d: Diseno, s: number) => d.secciones[s]?.items.map((i) => nodoDelItem(i))

describe('sumar y quitar piezas', () => {
  it('suma una pieza en su lugar y al final si el lugar pasa del largo, sin mutar', () => {
    expect(nodos(sumarItem(base, 'a', 1, celda('libre')), 0)).toEqual(['a', 'libre', 'b'])
    expect(nodos(sumarItem(base, 'a', 99, celda('libre')), 0)).toEqual(['a', 'b', 'libre'])
    expect(nodos(sumarItem(base, 'a', -3, { tipo: 'total' }), 0)).toEqual([null, 'a', 'b'])
    expect(nodos(base, 0)).toEqual(['a', 'b'])
  })

  it('en el tope de piezas no suma nada', () => {
    const lleno = disenoDe([
      seccion(
        'a',
        Array.from({ length: MAXIMO_DE_ITEMS_DEL_DISENO }, () => celda('a')),
      ),
    ])
    expect(hayLugarParaOtraPieza(lleno)).toBe(false)
    expect(sumarItem(lleno, 'a', 0, celda('b'))).toBe(lleno)
    expect(piezasDelDiseno(base)).toBe(3)
  })

  it('quita la primera pieza así de su sección; los atajos y la celda del mismo nodo son dos piezas', () => {
    const conAtajos = sumarItem(base, 'a', 0, { tipo: 'atajos', nodo: 'a', columna: 'x', filas: 2 })
    const sinAtajos = quitarItem(conAtajos, { seccion: 'a', tipo: 'atajos', nodo: 'a' })
    expect(sinAtajos.secciones[0]?.items.map((i) => i.tipo)).toEqual(['celda', 'celda'])
    expect(nodos(quitarItem(base, { seccion: 'a', tipo: 'celda', nodo: 'b' }), 0)).toEqual(['a'])
    expect(quitarItem(base, { seccion: 'a', tipo: 'celda', nodo: 'zz' })).toEqual(base)
  })
})

describe('sumar y quitar secciones', () => {
  it('suma una sección vacía con un id libre y su título', () => {
    const { diseno, seccion: id } = sumarSeccion(base, 'avanzado')
    expect(id).toBe('seccion_3')
    expect(diseno.secciones.at(-1)).toEqual({
      id: 'seccion_3',
      titulo: 'Sección 3',
      presentacion: 'avanzado',
      items: [],
    })
    expect(seccionVacia(diseno)?.id).toBe('seccion_3')
    expect(motivoDeLaSeccionVacia({ id: 'seccion_3', titulo: 'Sección 3' })).toBe(
      'La sección «Sección 3» está vacía: suma una pieza o quítala para guardar.',
    )
    const otra = sumarSeccion(
      disenoDe([seccion('seccion_2', [celda('a')]), seccion('seccion_3', [celda('b')])]),
      'principal',
    )
    expect(otra.seccion).toBe('seccion_4')
  })

  it('quita una sección, salvo la última', () => {
    const quitada = quitarSeccion(base, 'a')
    expect(quitada.ok && quitada.diseno.secciones.map((s) => s.id)).toEqual(['b'])
    const sola = disenoDe([seccion('a', [celda('a')])])
    expect(quitarSeccion(sola, 'a')).toEqual({ ok: false, motivo: MOTIVO_DE_LA_ULTIMA_SECCION })
    expect(quitarSeccion(base, 'zz')).toEqual({ ok: true, diseno: base })
  })
})
