import { describe, expect, it } from 'vitest'
import { celda, disenoDe, formulaDePrueba, seccion } from './diseno-de-prueba.soporte'
import { seccionesDelLienzo } from './lienzo-de-la-hoja'

describe('las secciones del lienzo', () => {
  it('cada ítem en su lugar, con su dibujo o nulo si su nodo ya no está; la sección vacía también', () => {
    const valido = disenoDe([
      seccion('s', [celda('a'), celda('ya_no'), { tipo: 'total' }], { tono: 'azul' }),
    ])
    // Una sección vacía no valida, pero el editor la dibuja mientras se arma.
    const d = { ...valido, secciones: [...valido.secciones, seccion('vacia', [])] }
    const [s, vacia] = seccionesDelLienzo(d, formulaDePrueba)
    expect(s?.piezas.map((p) => p.dibujo?.tipo ?? null)).toEqual(['celda', null, 'total'])
    expect(s?.piezas[2]?.dibujo).toMatchObject({ tipo: 'total', nodo: 'total', etiqueta: 'Total' })
    expect(vacia?.piezas).toEqual([])
  })
})
