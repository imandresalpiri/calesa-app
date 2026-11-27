import { describe, expect, it } from 'vitest'
import { FUNCIONES } from '../compilador-funciones'
import type { Formula } from '../formula'
import type { Nodo } from '../nodos'
import { FUNCIONES_DE_LA_AYUDA } from './ayuda-de-funciones'
import { compilarFila } from './compilar-fila'
import { deA1 } from './de-a1'
import { hojaDeLaPlanilla } from './hoja-de-la-planilla'

// Nueve montos y, en la 10, la fila donde se escribe cada ejemplo.
const NODOS = [
  ...Array.from({ length: 9 }, (_, i) => ({
    id: `m${String(i + 1)}`,
    tipo: 'input',
    etiqueta: `Monto ${String(i + 1)}`,
  })),
  { id: 'destino', tipo: 'constante', etiqueta: 'Destino', salida: 'total' },
] as Nodo[]
const FORMULA: Formula = {
  definicion: { nodos: NODOS, buckets: { b: 'm1' } },
  params: { constantes: { destino: 0 }, tablas: {} },
}
const TABLAS = [
  { clave: 'fletes', columnas: ['origen', 'precio'] },
  { clave: 'depreciacion', columnas: ['desde', 'hasta', 'factor'] },
]

describe('FUNCIONES_DE_LA_AYUDA', () => {
  it('son exactamente las funciones del compilador', () => {
    expect(FUNCIONES_DE_LA_AYUDA.map((f) => f.nombre).sort()).toEqual([...FUNCIONES.keys()].sort())
  })

  it.each(FUNCIONES_DE_LA_AYUDA.map((f) => [f.nombre, f] as const))(
    '%s: la firma se arma con sus valores',
    (_, f) => {
      const valores = [...f.argumentos, ...(f.repite ? ['…'] : [])].join('; ')
      expect(f.firma).toBe(`${f.nombre}(${valores})`)
    },
  )

  it.each(FUNCIONES_DE_LA_AYUDA.map((f) => [f.nombre, f.ejemplo] as const))(
    '%s: su ejemplo compila',
    (_, ejemplo) => {
      const hoja = hojaDeLaPlanilla(FORMULA)
      const a = deA1(ejemplo, hoja, 10)
      if (!a.ok) throw new Error(a.error.mensaje)
      const c = compilarFila(FORMULA, {
        destino: { existente: 'destino' },
        texto: a.texto,
        tablas: TABLAS,
        confirmaPisar: true,
      })
      if (!c.ok) throw new Error(c.error.mensaje)
      expect(c.ok).toBe(true)
    },
  )
})
