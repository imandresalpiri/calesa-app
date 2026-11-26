import { describe, expect, it } from 'vitest'
import type { Formula } from '../formula'
import type { Nodo } from '../nodos'
import { aplicarLoEscrito } from './escrito-en-la-celda'
import { conElAjuste, formulaDePrueba } from './fila-de-prueba.soporte'
import { FORMULA_A1 } from './hoja-a1.soporte'
import { hojaDeLaPlanilla } from './hoja-de-la-planilla'
import { resultadoAlLado, type PedidoDelResultado } from './resultado-al-lado'
import { TERRENO_VACIO } from './terreno-de-prueba'
import { UNIDAD_EN_CEROS } from './unidad-de-ejemplo'

// 1 TC oficial · 2 Remate (asesor) · 3 Fees (100) · 4 Flete (asesor) · 5 Agencia · 6 Seguro (2 %) · 7 CIF · 8 Total. Sin el grupo vacío
// y con el total en su bucket, para que valide.
const conDecimales: Formula = {
  ...FORMULA_A1,
  definicion: {
    ...FORMULA_A1.definicion,
    grupos: [],
    nodos: FORMULA_A1.definicion.nodos.map((n): Nodo => {
      if (n.id === 'cif') return { ...n, decimales: 2 }
      return n.id === 'total' ? { ...n, bucket: 'b' } : n
    }),
  },
}

const pedido = (
  id: string,
  texto: string,
  otro: Partial<PedidoDelResultado> = {},
): PedidoDelResultado => {
  const formula = otro.formula ?? conDecimales
  return {
    formula,
    hoja: otro.hoja ?? hojaDeLaPlanilla(formula),
    id,
    col: 'C',
    texto,
    locale: 'es-BO',
    tablas: null,
    terreno: { ...TERRENO_VACIO, tipos_cambio: { oficial: 6.96 }, monedas: { oficial: 'BOB' } },
    unidad: { ...UNIDAD_EN_CEROS, inputs: { remate: 1000 } },
    modo: undefined,
    ...otro,
  }
}

describe('resultadoAlLado', () => {
  it('un texto que compila da su cifra con los decimales de la celda', () => {
    expect(resultadoAlLado(pedido('cif', '=C2+C3*2'))).toEqual({
      tipo: 'valor',
      valor: 1200,
      formato: undefined,
      decimales: 2,
    })
  })

  it('un error del compilador (un paréntesis sin cerrar) no da nada', () => {
    expect(resultadoAlLado(pedido('cif', '=(C2+C3'))).toBeNull()
  })

  it('sólo la C: A, B y el Ejemplo no dan nada', () => {
    for (const col of ['A', 'B', 'D'] as const) {
      expect(resultadoAlLado(pedido('cif', '=C2+C3', { col })), col).toBeNull()
    }
  })

  it('sin «=» no da nada', () => {
    expect(resultadoAlLado(pedido('fees', '250'))).toBeNull()
    expect(resultadoAlLado(pedido('cif', ''))).toBeNull()
  })

  it('un texto que pisaría un ⚙ da lo que daría: el «Pisar el valor» sigue al aplicar', () => {
    // El ⚙ dejó total__2 en −3: el texto ya no manda.
    const ajustada = conElAjuste(
      formulaDePrueba([{ id: 'total', texto: '=(remate+fees)*4%' }]),
      'total__2',
      -3,
    )
    const hoja = hojaDeLaPlanilla(ajustada)
    const c = (id: string) => `C${String(hoja.numeroDe.get(id))}`
    const p = pedido('total', `=(${c('remate')}+${c('fees')})*4%`, { formula: ajustada, hoja })
    const numero = hoja.numeroDe.get('total') ?? 0
    expect(aplicarLoEscrito({ ...p, numero })).toMatchObject({
      tipo: 'error',
      error: { pisa: expect.anything() },
    })
    expect(resultadoAlLado(p)).toMatchObject({ tipo: 'valor', valor: 40 })
  })

  it('una tabla que lo de prueba no leyó no da nada', () => {
    const texto = '=BUSCARV(C2; "fletes"; "precio")'
    const p = pedido('cif', texto, { tablas: [{ clave: 'fletes', columnas: ['precio'] }] })
    expect(aplicarLoEscrito({ ...p, numero: 7 }).tipo).toBe('formula')
    expect(resultadoAlLado(p)).toBeNull()
  })

  it('una fila que ya no está no da nada', () => {
    expect(resultadoAlLado(pedido('no_esta', '=C3'))).toBeNull()
  })
})
