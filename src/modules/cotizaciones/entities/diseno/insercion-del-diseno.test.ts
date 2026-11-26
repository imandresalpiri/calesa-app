import { describe, expect, it } from 'vitest'
import { MAXIMO_DE_ITEMS_DEL_DISENO, nodoDelItem, type Diseno } from '../diseno'
import { celda, disenoDe, en, seccion } from './diseno-de-prueba.soporte'
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
  it('suma una pieza en el primer lugar libre donde entra, en orden de lectura y sin mutar', () => {
    const sumada = sumarItem(base, 'a', celda('libre'))
    expect(nodos(sumada, 0)).toEqual(['a', 'b', 'libre'])
    expect(sumada.secciones[0]?.items[2]?.posicion).toEqual({ columna: 1, fila: 3 })
    expect(nodos(base, 0)).toEqual(['a', 'b'])
    const conHueco = disenoDe([
      seccion('a', [celda('a', { ancho: 6, ...en(1, 1) }), celda('b', en(1, 3))], en(1, 1)),
    ])
    // El hueco a la derecha de «a» recibe una de 6; una de 12 va a la fila 2, que está vacía; con `despues`, después de esa posición.
    const chica = sumarItem(conHueco, 'a', celda('libre', { ancho: 6 }))
    expect(chica.secciones[0]?.items[1]).toMatchObject({
      nodo: 'libre',
      posicion: { columna: 7, fila: 1 },
    })
    expect(nodos(sumarItem(conHueco, 'a', celda('libre')), 0)).toEqual(['a', 'libre', 'b'])
    const despues = sumarItem(conHueco, 'a', celda('libre', { ancho: 6 }), { columna: 1, fila: 3 })
    expect(despues.secciones[0]?.items[2]).toMatchObject({
      nodo: 'libre',
      posicion: { columna: 1, fila: 4 },
    })
  })

  it('en el tope de piezas no suma nada', () => {
    const lleno = disenoDe([
      seccion(
        'a',
        Array.from({ length: MAXIMO_DE_ITEMS_DEL_DISENO }, () => celda('a')),
      ),
    ])
    expect(hayLugarParaOtraPieza(lleno)).toBe(false)
    expect(sumarItem(lleno, 'a', celda('b'))).toBe(lleno)
    expect(sumarItem(base, 'zz', celda('b'))).toBe(base)
    expect(piezasDelDiseno(base)).toBe(3)
  })

  it('quita la primera pieza así de su sección; los atajos y la celda del mismo nodo son dos piezas', () => {
    const conAtajos = sumarItem(base, 'a', { tipo: 'atajos', nodo: 'a', columna: 'x', filas: 2 })
    const sinAtajos = quitarItem(conAtajos, { seccion: 'a', tipo: 'atajos', nodo: 'a' })
    expect(sinAtajos.secciones[0]?.items.map((i) => i.tipo)).toEqual(['celda', 'celda'])
    expect(nodos(quitarItem(base, { seccion: 'a', tipo: 'celda', nodo: 'b' }), 0)).toEqual(['a'])
    expect(quitarItem(base, { seccion: 'a', tipo: 'celda', nodo: 'zz' })).toEqual(base)
  })
})

describe('sumar y quitar secciones', () => {
  it('suma una sección vacía con un id libre y su título; la primera avanzada trae el bloque «Avanzado»', () => {
    const { diseno, seccion: id } = sumarSeccion(base, 'avanzado')
    expect(id).toBe('seccion_3')
    expect(diseno.secciones.at(-1)).toEqual({
      id: 'seccion_3',
      titulo: 'Sección 3',
      presentacion: 'avanzado',
      posicion: { columna: 1, fila: 1 },
      items: [],
    })
    // «a» y «b» son automáticas: 6 columnas cada una en la fila 1; el bloque va en la 2.
    expect(diseno.avanzado).toEqual({ fila: 2 })
    const otraAvanzada = sumarSeccion(diseno, 'avanzado').diseno
    expect(otraAvanzada.secciones.at(-1)?.posicion).toEqual({ columna: 1, fila: 2 })
    expect(otraAvanzada.avanzado).toEqual({ fila: 2 })
    const principal = sumarSeccion(diseno, 'principal').diseno
    expect(principal.secciones.find((s) => s.id === 'seccion_4')?.posicion).toEqual({
      columna: 1,
      fila: 3,
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

  it('quita una sección, salvo la última; sin avanzadas, el bloque «Avanzado» se va', () => {
    const quitada = quitarSeccion(base, 'a')
    expect(quitada.ok && quitada.diseno.secciones.map((s) => s.id)).toEqual(['b'])
    const conAvanzada = sumarSeccion(base, 'avanzado')
    const sinAvanzada = quitarSeccion(conAvanzada.diseno, conAvanzada.seccion)
    expect(sinAvanzada.ok && sinAvanzada.diseno).toEqual(base)
    const sola = disenoDe([seccion('a', [celda('a')])])
    expect(quitarSeccion(sola, 'a')).toEqual({ ok: false, motivo: MOTIVO_DE_LA_ULTIMA_SECCION })
    expect(quitarSeccion(base, 'zz')).toEqual({ ok: true, diseno: base })
  })
})
