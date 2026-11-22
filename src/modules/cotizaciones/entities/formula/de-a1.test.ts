import { describe, expect, it } from 'vitest'
import { compilarFila } from './compilar-fila'
import { deA1, tramoEnLoTipeado, type ResultadoDeA1 } from './de-a1'
import { filasDe } from './filas'
import { FORMULA_A1, conNodoAntes } from './hoja-a1.soporte'
import { hojaDeLaPlanilla } from './hoja-de-la-planilla'
import { nombrarConLaHoja } from './referencias-a1'

const hoja = hojaDeLaPlanilla(FORMULA_A1)
// La fila 8 (Total) puede nombrar todas las de arriba.
const TOTAL = 8

const texto = (r: ResultadoDeA1) => (r.ok ? r.texto : `error: ${r.error.mensaje}`)

describe('deA1 › lo tipeado a ids', () => {
  it('cada celda pasa a su id; la B de la fila 5, a su pct absorbida', () => {
    expect(texto(deA1('=C2+C3*B5', hoja, TOTAL))).toBe('=remate+fees*agencia_pct')
  })

  it('no distingue mayúsculas y acepta los «$»', () => {
    expect(texto(deA1('=$C$2+c3+$c4', hoja, TOTAL))).toBe('=remate+fees+flete')
  })

  it('un rango dentro de SUMA, MAX o MIN se expande a las filas, en orden', () => {
    expect(texto(deA1('=SUMA(C2:C4)', hoja, TOTAL))).toBe('=SUMA(remate; fees; flete)')
    expect(texto(deA1('=MAX(C4:C2; 1)', hoja, TOTAL))).toBe('=MAX(remate; fees; flete; 1)')
    expect(texto(deA1('=min(c2:$C$3)', hoja, TOTAL))).toBe('=min(remate; fees)')
  })

  it('un id tipeado de una fila de arriba se acepta igual', () => {
    expect(texto(deA1('=remate+C3', hoja, TOTAL))).toBe('=remate+fees')
    expect(texto(deA1('=agencia_pct', hoja, TOTAL))).toBe('=agencia_pct')
  })

  it('grupos, funciones, textos y nombres que no son de la hoja quedan como están', () => {
    expect(texto(deA1('=SUMA(primer_pago)', hoja, TOTAL))).toBe('=SUMA(primer_pago)')
    expect(texto(deA1('=BUSCARV(C2; "fletes"; "precio")+zzz', hoja, TOTAL))).toBe(
      '=BUSCARV(remate; "fletes"; "precio")+zzz',
    )
  })

  it('un grupo con forma de celda es el grupo si se dice que lo es', () => {
    expect(texto(deA1('=SUMA(b1)', hoja, TOTAL, new Set(['b1'])))).toBe('=SUMA(b1)')
  })

  it('un nombre con forma de celda es siempre una celda, aunque haya un id igual', () => {
    const f = conNodoAntes(
      FORMULA_A1,
      { id: 'c5', tipo: 'input', etiqueta: 'Viejo' } as never,
      'tc',
    )
    const h = hojaDeLaPlanilla(f)
    expect(texto(deA1('=c5', h, 9))).toBe('=flete')
  })
})

const RECHAZOS = [
  ['=C7+1', 5, 'hacia_abajo', 'C7 está más abajo: una fórmula sólo usa filas de arriba.', 1, 2],
  ['=C2+C5', 5, 'misma_fila', 'Una fila no se usa a sí misma (C5).', 4, 2],
  ['=C40', TOTAL, 'fila_inexistente', 'C40 no existe: la planilla llega hasta la fila 8.', 1, 3],
  ['=C0', TOTAL, 'fila_inexistente', 'C0 no existe: la planilla llega hasta la fila 8.', 1, 2],
  ['=A2*2', TOTAL, 'columna_a', 'A2 es el concepto: en una fórmula va C2 (valor) o B2 (%).', 1, 2],
  [
    '=D2',
    TOTAL,
    'columna_ejemplo',
    'D2: Ejemplo no se usa en una fórmula: es la unidad de ejemplo. En una fórmula va C2.',
    1,
    2,
  ],
  [
    '=E2',
    TOTAL,
    'columna_inexistente',
    'E2 no es una columna de la planilla: en una fórmula va C2 (valor) o B2 (%).',
    1,
    2,
  ],
  ['=B2', TOTAL, 'b_sin_pct', 'B2 no tiene porcentaje: B sólo vale en una fila con %.', 1, 2],
  [
    '=1+B6',
    TOTAL,
    'b_en_la_formula',
    'B6 es un número escrito en la fórmula de la fila 6: pásalo a su propia fila para usarlo.',
    3,
    2,
  ],
  [
    '=C2:C4',
    TOTAL,
    'rango_fuera_de_lugar',
    'Un rango (C2:C4) sólo va dentro de SUMA, MAX o MIN.',
    1,
    5,
  ],
  [
    '=SI(C2:C4; 1; 0)',
    TOTAL,
    'rango_fuera_de_lugar',
    'Un rango (C2:C4) sólo va dentro de SUMA, MAX o MIN.',
    4,
    5,
  ],
  ['=SUMA(B2:C4)', TOTAL, 'rango_fuera_de_c', 'Un rango va sobre la columna C, como C2:C4.', 6, 5],
  [
    '=SUMA(C2:C9)',
    TOTAL,
    'fila_inexistente',
    'C9 no existe: la planilla llega hasta la fila 8.',
    6,
    5,
  ],
  ['=SUMA(C2:C8)', TOTAL, 'misma_fila', 'Una fila no se usa a sí misma (C8).', 6, 5],
  ['=B5', 3, 'hacia_abajo', 'B5 está más abajo: una fórmula sólo usa filas de arriba.', 1, 2],
  ['=cif', 5, 'hacia_abajo', 'C7 está más abajo: una fórmula sólo usa filas de arriba.', 1, 3],
] as const

describe('deA1 › los rechazos, con su tramo en lo tipeado', () => {
  const rechazo = (tipeado: string, actual: number) => {
    const r = deA1(tipeado, hoja, actual)
    if (r.ok) throw new Error(`«${tipeado}» no se rechazó`)
    return r.error
  }

  it.each(RECHAZOS)('%s en la fila %i: %s', (...caso) => {
    const [tipeado, actual, codigo, mensaje, desde, largo] = caso
    expect(rechazo(tipeado, actual)).toMatchObject({ codigo, mensaje, tramo: { desde, largo } })
  })

  it('una referencia hacia abajo ofrece mover la fila debajo de la más baja que nombra', () => {
    expect(rechazo('=C6+C7', 5).moverDebajoDe).toBe(7)
    expect(rechazo('=SUMA(C2:C7)', 5).moverDebajoDe).toBe(7)
    expect(rechazo('=C2+C5', 5).moverDebajoDe).toBeUndefined()
  })

  it('el tramo dice la línea y la columna', () => {
    expect(rechazo('=C2+\n  C9', TOTAL).tramo).toEqual({ desde: 7, largo: 2, linea: 2, columna: 3 })
  })
})

describe('tramoEnLoTipeado', () => {
  it('un tramo sobre un id vuelve a la celda tipeada; uno de después, corrido', () => {
    const r = deA1('=C2+C3+zzz', hoja, TOTAL)
    if (!r.ok) throw new Error(r.error.mensaje)
    expect(r.texto).toBe('=remate+fees+zzz')
    const sobreFees = { desde: 8, largo: 4, linea: 1, columna: 9 }
    expect(tramoEnLoTipeado(sobreFees, r.mapa, '=C2+C3+zzz')).toMatchObject({ desde: 4, largo: 2 })
    const sobreZzz = { desde: 13, largo: 3, linea: 1, columna: 14 }
    expect(tramoEnLoTipeado(sobreZzz, r.mapa, '=C2+C3+zzz')).toMatchObject({ desde: 7, largo: 3 })
  })

  it('el error del compilador sobre el texto con ids se marca en lo tipeado', () => {
    const tipeado = '=SUMA(C2:C4)+zzz'
    const r = deA1(tipeado, hoja, TOTAL)
    if (!r.ok) throw new Error(r.error.mensaje)
    const c = compilarFila(FORMULA_A1, { destino: { existente: 'total' }, texto: r.texto })
    if (c.ok) throw new Error('compiló')
    if (!('tramo' in c.error)) throw new Error('sin tramo')
    expect(c.error.codigo).toBe('nombre_desconocido')
    expect(tramoEnLoTipeado(c.error.tramo, r.mapa, tipeado)).toMatchObject({ desde: 13, largo: 3 })
  })
})

describe('deA1 + compilarFila', () => {
  it('lo que se guarda en `nodo.texto` es el texto con ids, nunca A1', () => {
    const r = deA1('=SUMA(C2:C4)+C5', hoja, TOTAL)
    if (!r.ok) throw new Error(r.error.mensaje)
    const c = compilarFila(FORMULA_A1, { destino: { existente: 'total' }, texto: r.texto })
    if (!c.ok) throw new Error(c.error.mensaje)
    const total = filasDe(c.formula.definicion).find((f) => f.nodo.id === 'total')
    expect(total?.texto).toBe('=SUMA(remate; fees; flete)+agencia')
    expect(total?.texto).not.toMatch(/\b[A-Da-d]\d/)
  })

  it('con `nombrar`, un error del compilador nombra la celda y no el id', () => {
    const r = deA1('=SUMA(C2; primer_pago)', hoja, TOTAL)
    if (!r.ok) throw new Error(r.error.mensaje)
    const c = compilarFila(FORMULA_A1, {
      destino: { existente: 'total' },
      texto: r.texto,
      nombrar: nombrarConLaHoja(hoja),
    })
    expect(c.ok).toBe(false)
    if (c.ok) return
    expect(c.error.mensaje).not.toMatch(/remate/)
  })
})
