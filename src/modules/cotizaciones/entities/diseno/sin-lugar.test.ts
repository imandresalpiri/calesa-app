import { describe, expect, it } from 'vitest'
import { celda, disenoDe, formulaDePrueba, seccion } from './diseno-de-prueba.soporte'
import { filasSinLugar, nodosDibujados } from './sin-lugar'

describe('las filas sin lugar en la hoja', () => {
  it('las que la base pide dibujar y no tienen pieza, en el orden de la fórmula, con la pieza que las dibuja', () => {
    const d = disenoDe([seccion('s', [celda('a')])])
    expect(filasSinLugar(formulaDePrueba, d)).toEqual([
      { nodo: 'variante', etiqueta: 'Variante', tipo: 'variante' },
      { nodo: 'b', etiqueta: 'B', tipo: 'celda' },
      { nodo: 'c', etiqueta: 'C', tipo: 'celda' },
      { nodo: 'libre', etiqueta: 'Libre', tipo: 'celda' },
      { nodo: 'tasa', etiqueta: 'Tasa', tipo: 'celda' },
    ])
  })

  it('el porcentaje de una celda con secundario ya está dibujado; los atajos y la tarjeta del total no dibujan', () => {
    const d = disenoDe([
      seccion('s', [
        celda('comision', { secundario: 'porcentaje' }),
        { tipo: 'variante', nodo: 'variante' },
        { tipo: 'atajos', nodo: 'b', columna: 'x', filas: 2 },
        { tipo: 'total' },
      ]),
    ])
    expect([...nodosDibujados(formulaDePrueba, d)].sort()).toEqual(['comision', 'tasa', 'variante'])
    expect(filasSinLugar(formulaDePrueba, d).map((f) => f.nodo)).toEqual(['a', 'b', 'c', 'libre'])
  })
})
