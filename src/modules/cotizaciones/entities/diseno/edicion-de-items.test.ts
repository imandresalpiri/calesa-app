import { describe, expect, it } from 'vitest'
import casos from '../casos-de-diseno.json'
import { esquemaDiseno, nodoDelItem, type Diseno } from '../diseno'
import { esquemaDefinicion } from '../formula'
import { validarDiseno } from '../validar-diseno'
import { nodosPorId } from './admite-nivel'
import { columnasParaAtajos, ponerAtajos, ponerEfecto } from './edicion-de-items'

const juego = casos as unknown as {
  contexto: { niveles: string[]; retirados: string[]; tonos: string[] }
  formulas: Record<string, { definicion: unknown }>
  casos: { nombre: string; diseno: unknown }[]
}
const definicion = esquemaDefinicion.parse(juego.formulas['capturas']?.definicion)
const capturas = esquemaDiseno.parse(
  juego.casos.find((c) => c.nombre.startsWith('capturas'))?.diseno,
)

function congelar<T>(valor: T): T {
  if (typeof valor === 'object' && valor !== null) {
    Object.values(valor).forEach(congelar)
    Object.freeze(valor)
  }
  return valor
}
const itemDe = (d: Diseno, seccion: string, tipo: string, nodo: string) =>
  d.secciones
    .find((s) => s.id === seccion)
    ?.items.find((i) => i.tipo === tipo && nodoDelItem(i) === nodo)
const valida = (d: Diseno) => validarDiseno(definicion, d, juego.contexto).ok

describe('atajos', () => {
  it('T4 · ponerAtajos acota las filas a 1..12 y descarta lo que no es número; sin mutar', () => {
    const d = congelar(capturas)
    expect(
      itemDe(ponerAtajos(d, 'cif', 'factor_dp', { filas: 99 }), 'cif', 'atajos', 'factor_dp'),
    ).toMatchObject({ filas: 12 })
    expect(
      itemDe(ponerAtajos(d, 'cif', 'factor_dp', { filas: 0 }), 'cif', 'atajos', 'factor_dp'),
    ).toMatchObject({ filas: 1 })
    expect(
      itemDe(ponerAtajos(d, 'cif', 'factor_dp', { filas: 4.7 }), 'cif', 'atajos', 'factor_dp'),
    ).toMatchObject({ filas: 4 })
    expect(ponerAtajos(d, 'cif', 'factor_dp', { filas: Number.NaN })).toStrictEqual(d)
    expect(ponerAtajos(d, 'cif', 'factor_dp', { columna: 'anio' })).toStrictEqual(d)
    expect(valida(ponerAtajos(d, 'cif', 'factor_dp', { filas: 5 }))).toBe(true)
  })

  it('T4 · columnasParaAtajos da las claves de match y la columna del nodo, sin repetir y con la actual', () => {
    const nodos = nodosPorId(definicion)
    expect(columnasParaAtajos(nodos, 'factor_dp', 'anio')).toContain('anio')
    const con = columnasParaAtajos(nodos, 'factor_dp', 'rara')
    expect(con).toContain('rara')
    expect(new Set(con).size).toBe(con.length)
    expect(columnasParaAtajos(nodos, 'no_existe', 'x')).toStrictEqual(['x'])
  })
})

describe('interruptor', () => {
  it('T4 · ponerEfecto sólo acepta habilita y muestra', () => {
    const d = congelar(capturas)
    const muestra = ponerEfecto(d, 'hoja', 'cuenta_especial_usa', 'muestra')
    expect(itemDe(muestra, 'hoja', 'interruptor', 'cuenta_especial_usa')).toMatchObject({
      efecto: 'muestra',
    })
    expect(ponerEfecto(d, 'hoja', 'cuenta_especial_usa', 'otro' as 'muestra')).toStrictEqual(d)
  })
})
