import { describe, expect, it } from 'vitest'
import type { SeccionDeDiseno } from '../diseno'
import { celda, disenoDe, en, formulaDePrueba, seccion } from './diseno-de-prueba.soporte'
import { seccionesDelLienzo } from './lienzo-de-la-hoja'

describe('las secciones del lienzo', () => {
  it('cada ítem en su lugar, con su dibujo o nulo si su nodo ya no está; la sección vacía también', () => {
    const valido = disenoDe([
      seccion('s', [celda('a'), celda('ya_no'), { tipo: 'total' }], { tono: 'azul' }),
    ])
    // Una sección vacía no valida, pero el editor la dibuja mientras se arma.
    const vacia: SeccionDeDiseno = {
      ...seccion('vacia', []),
      items: [],
      posicion: { columna: 1, fila: 2 },
    }
    const d = { ...valido, secciones: [...valido.secciones, vacia] }
    const [s, dibujada] = seccionesDelLienzo(d, formulaDePrueba)
    expect(s?.piezas.map((p) => p.dibujo?.tipo ?? null)).toEqual(['celda', null, 'total'])
    expect(s?.piezas[2]?.dibujo).toMatchObject({ tipo: 'total', nodo: 'total', etiqueta: 'Total' })
    expect(dibujada?.piezas).toEqual([])
    expect(dibujada).toMatchObject({ rejilla: null, filaDelHueco: 1 })
  })

  it('la rejilla de sus piezas con la fila del «+» debajo de la última, también tras un hueco', () => {
    const d = disenoDe([
      seccion(
        's',
        [celda('a', { ancho: 'mitad', ...en(1, 1) }), celda('b', { ancho: 'mitad', ...en(7, 3) })],
        en(1, 1),
      ),
    ])
    const [s] = seccionesDelLienzo(d, formulaDePrueba)
    expect(s?.filaDelHueco).toBe(4)
    expect(s?.rejilla).toEqual({ corte: 'lg', filas: 'auto 2.5rem auto auto' })
  })
})
