import { describe, expect, it } from 'vitest'
import type { CapaDe, NodoDelTrazo } from '../documento'
import {
  agregarNodo,
  cajaDelTrazo,
  cerrar,
  datosDelTrazo,
  escalarNodos,
  moverAsa,
  moverNodo,
  normalizar,
  puntoDelTrazo,
  quitarNodo,
  segmentoMasCercano,
  tocaElPrimero,
} from './pluma'

const recto = (x: number, y: number): NodoDelTrazo => ({ x, y, entrada: null, salida: null })

// Una curva que sale hacia arriba y vuelve: sus asas quedan en y = -100, la curva llega a y = -75.
const ARCO: NodoDelTrazo[] = [
  { x: 0, y: 0, entrada: null, salida: { x: 0, y: -100 } },
  { x: 100, y: 0, entrada: { x: 100, y: -100 }, salida: null },
]

function trazo(nodos: NodoDelTrazo[], cambios: Partial<CapaDe<'trazo'>> = {}): CapaDe<'trazo'> {
  return {
    id: 'tr',
    nombre: null,
    grupoId: null,
    x: 10,
    y: 20,
    ancho: 100,
    alto: 100,
    rotacion: 0,
    opacidad: 1,
    bloqueada: false,
    oculta: false,
    sombra: null,
    tipo: 'trazo',
    nodos,
    cerrado: false,
    relleno: null,
    borde: '#000000',
    grosor: 2,
    ...cambios,
  }
}

describe('el texto del trazo', () => {
  it('un tramo recto va con L y uno curvo con C', () => {
    expect(datosDelTrazo([recto(0, 0), recto(100, 0)], false)).toBe('M 0 0 L 100 0')
    expect(datosDelTrazo(ARCO, false)).toBe('M 0 0 C 0 -100 100 -100 100 0')
  })

  it('si sólo una de las dos asas existe, la otra es el propio nodo', () => {
    const nodos = [{ ...recto(0, 0), salida: { x: 10, y: 10 } }, recto(50, 0)]
    expect(datosDelTrazo(nodos, false)).toBe('M 0 0 C 10 10 50 0 50 0')
  })

  it('cerrado suma el tramo al primero y Z', () => {
    expect(datosDelTrazo([recto(0, 0), recto(100, 0), recto(50, 80)], true)).toBe(
      'M 0 0 L 100 0 L 50 80 L 0 0 Z',
    )
  })

  it('los números van con hasta dos decimales y sin ceros de más', () => {
    expect(datosDelTrazo([recto(1.234, -0.001), recto(2.5, 3)], false)).toBe('M 1.23 0 L 2.5 3')
    expect(datosDelTrazo([], false)).toBe('')
  })
})

describe('la caja del trazo', () => {
  it('encierra el extremo de la curva, no las asas', () => {
    const caja = cajaDelTrazo(ARCO, false)
    expect(caja.x).toBeCloseTo(0)
    expect(caja.ancho).toBeCloseTo(100)
    expect(caja.y).toBeCloseTo(-75)
    expect(caja.alto).toBeCloseTo(75)
  })

  it('de un trazo recto son sus nodos', () => {
    expect(cajaDelTrazo([recto(5, 5), recto(105, 45)], false)).toEqual({
      x: 5,
      y: 5,
      ancho: 100,
      alto: 40,
    })
  })

  it('normalizar corre la caja y deja los nodos relativos, sin mover el trazo', () => {
    const capa = normalizar(trazo([recto(5, 5), { ...recto(105, 45), entrada: { x: 90, y: 45 } }]))
    expect(capa).toMatchObject({ x: 15, y: 25, ancho: 100, alto: 40 })
    expect(capa.nodos).toEqual([recto(0, 0), { ...recto(100, 40), entrada: { x: 85, y: 40 } }])
  })

  it('con rotación no normaliza, y lo que ya está normalizado queda igual', () => {
    const rotado = trazo([recto(5, 5), recto(105, 45)], { rotacion: 30 })
    expect(normalizar(rotado)).toBe(rotado)
    const listo = trazo([recto(0, 0), recto(100, 100)])
    expect(normalizar(listo)).toBe(listo)
  })
})

describe('agregar un nodo', () => {
  it('en t = 0,5 la curva no cambia de forma', () => {
    const con = agregarNodo(ARCO, false, 0, 0.5)
    expect(con).toHaveLength(3)
    expect(con[1]?.x).toBeCloseTo(50)
    expect(con[1]?.y).toBeCloseTo(-75)
    for (let k = 0; k <= 10; k += 1) {
      const t = k / 10
      const antes = puntoDelTrazo(ARCO, false, 0, t)
      const despues =
        t <= 0.5 ? puntoDelTrazo(con, false, 0, t * 2) : puntoDelTrazo(con, false, 1, (t - 0.5) * 2)
      expect(despues?.x).toBeCloseTo(antes?.x ?? Number.NaN)
      expect(despues?.y).toBeCloseTo(antes?.y ?? Number.NaN)
    }
  })

  it('en un tramo recto suma un nodo recto en el medio', () => {
    expect(agregarNodo([recto(0, 0), recto(100, 0)], false, 0, 0.25)).toEqual([
      recto(0, 0),
      recto(25, 0),
      recto(100, 0),
    ])
  })

  it('el tramo que cierra va al final', () => {
    const nodos = [recto(0, 0), recto(100, 0), recto(100, 100)]
    const con = agregarNodo(nodos, true, 2, 0.5)
    expect(con).toHaveLength(4)
    expect(con[3]).toEqual(recto(50, 50))
  })

  it('un tramo que no existe no agrega nada', () => {
    expect(agregarNodo([recto(0, 0), recto(1, 1)], false, 5, 0.5)).toHaveLength(2)
  })
})

describe('mover y quitar', () => {
  const nodo = { x: 50, y: 50, entrada: { x: 40, y: 50 }, salida: { x: 60, y: 50 } }

  it('mover un nodo lleva sus asas', () => {
    expect(moverNodo([nodo, recto(0, 0)], 0, { x: 55, y: 45 })[0]).toEqual({
      x: 55,
      y: 45,
      entrada: { x: 45, y: 45 },
      salida: { x: 65, y: 45 },
    })
  })

  it('un asa simétrica refleja la otra; con Alt, sólo esa', () => {
    const asa = { lado: 'salida' as const, punto: { x: 70, y: 40 } }
    expect(moverAsa([nodo], 0, asa, true)[0]).toEqual({
      x: 50,
      y: 50,
      salida: { x: 70, y: 40 },
      entrada: { x: 30, y: 60 },
    })
    expect(moverAsa([nodo], 0, asa, false)[0]?.entrada).toEqual({ x: 40, y: 50 })
  })

  it('quitar saca el nodo, y con dos no quita', () => {
    const tres = [recto(0, 0), recto(1, 1), recto(2, 2)]
    expect(quitarNodo(tres, 1)).toEqual([recto(0, 0), recto(2, 2)])
    const dos = [recto(0, 0), recto(1, 1)]
    expect(quitarNodo(dos, 0)).toBe(dos)
  })

  it('escalar los nodos con la caja', () => {
    expect(escalarNodos([nodo], 2, 0.5)).toEqual([
      { x: 100, y: 25, entrada: { x: 80, y: 25 }, salida: { x: 120, y: 25 } },
    ])
  })
})

describe('cerrar y buscar', () => {
  it('cerrar con tres nodos o más', () => {
    expect(cerrar(trazo([recto(0, 0), recto(100, 0), recto(50, 80)])).cerrado).toBe(true)
    const dos = trazo([recto(0, 0), recto(100, 0)])
    expect(cerrar(dos)).toBe(dos)
  })

  it('un clic sobre el primer nodo cierra', () => {
    const nodos = [recto(0, 0), recto(100, 0), recto(50, 80)]
    expect(tocaElPrimero(nodos, { x: 3, y: -2 }, 6)).toBe(true)
    expect(tocaElPrimero(nodos, { x: 20, y: 0 }, 6)).toBe(false)
    expect(tocaElPrimero(nodos.slice(0, 2), { x: 0, y: 0 }, 6)).toBe(false)
  })

  it('el tramo más cercano a un punto', () => {
    const cercano = segmentoMasCercano([recto(0, 0), recto(100, 0), recto(100, 100)], false, {
      x: 30,
      y: 5,
    })
    expect(cercano?.segmento).toBe(0)
    expect(cercano?.t).toBeCloseTo(0.3, 2)
    expect(cercano?.distancia).toBeCloseTo(5, 1)
    expect(segmentoMasCercano([recto(0, 0)], false, { x: 0, y: 0 })).toBeNull()
  })
})
