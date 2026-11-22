import { describe, expect, it } from 'vitest'
import { destinoDeLaFormulaVieja, destinoSinFormula } from './formula'
import { destinoAlEntrar } from './pestana'
import { destinoDeLasTablasViejas } from './tablas'

const O = '11111111-1111-4111-8111-111111111111'
const F = '22222222-2222-4222-8222-222222222222'
const BASE = `/configuracion/origenes/${O}`
const TODAS = ['fases', 'planilla', 'hoja', 'tarjeta', 'campos', 'categorias'] as const

const entrar = (
  parametros: Record<string, string | string[]>,
  {
    recordada = null,
    abiertas = TODAS,
  }: {
    recordada?: (typeof TODAS)[number] | null
    abiertas?: readonly (typeof TODAS)[number][]
  } = {},
) => destinoAlEntrar({ id: O, parametros, recordada, abiertas })

describe('destinoAlEntrar', () => {
  it('sin pedir nada: la recordada si la abre; si no, la primera que abre; si no abre ninguna, Fases', () => {
    expect(entrar({})).toBe(`${BASE}/fases`)
    expect(entrar({}, { recordada: 'hoja' })).toBe(`${BASE}/hoja`)
    expect(
      entrar(
        {},
        { recordada: 'fases', abiertas: ['planilla', 'hoja', 'tarjeta', 'campos', 'categorias'] },
      ),
    ).toBe(`${BASE}/planilla`)
    expect(entrar({}, { abiertas: [] })).toBe(`${BASE}/fases`)
  })

  it('`?seccion=` con los nombres de antes lleva a la pestaña nueva, con el resto de la consulta', () => {
    expect(entrar({ seccion: 'flujo', fase: 'x', vista: 'lista' })).toBe(
      `${BASE}/fases?fase=x&vista=lista`,
    )
    expect(entrar({ seccion: 'formula' })).toBe(`${BASE}/planilla`)
    expect(entrar({ seccion: 'formulas', panel: 'nueva-formula' })).toBe(
      `${BASE}/planilla?panel=nueva-formula`,
    )
    expect(entrar({ seccion: 'campos' })).toBe(`${BASE}/campos`)
    expect(entrar({ seccion: 'categorias' })).toBe(`${BASE}/categorias`)
  })

  it('`?seccion=tablas` abre el drawer de las tablas sobre la Planilla, con su panel en `accion`', () => {
    expect(entrar({ seccion: 'tablas', tabla: 't-1', panel: 'publicar-tabla' })).toBe(
      `${BASE}/planilla?panel=tablas&tabla=t-1&accion=publicar-tabla`,
    )
  })

  it('`?seccion=datos` abre el drawer de los datos sobre la de entrada; un panel pedido se respeta', () => {
    expect(entrar({ seccion: 'datos' }, { recordada: 'tarjeta' })).toBe(
      `${BASE}/tarjeta?panel=datos`,
    )
    expect(entrar({ seccion: 'datos', panel: 'otro' })).toBe(`${BASE}/fases?panel=otro`)
  })

  it('un `?campo=` va a Campos y una `?categoria=` a Categorías, con su valor', () => {
    expect(entrar({ campo: 'c-1' }, { recordada: 'hoja' })).toBe(`${BASE}/campos?campo=c-1`)
    expect(entrar({ categoria: 'k-1' })).toBe(`${BASE}/categorias?categoria=k-1`)
  })
})

describe('destinoDeLaFormulaVieja', () => {
  it('la parte con la fórmula elegida y su consulta', () => {
    expect(destinoDeLaFormulaVieja(O, F, 'planilla', { fila: 'n1' })).toBe(
      `${BASE}/planilla?formula=${F}&fila=n1`,
    )
    expect(destinoDeLaFormulaVieja(O, F, 'hoja', { vista: '412' })).toBe(
      `${BASE}/hoja?formula=${F}&vista=412`,
    )
    expect(destinoDeLaFormulaVieja(O, F, 'tarjeta', { lugar: 'celdas.c1', referencia: 'r' })).toBe(
      `${BASE}/tarjeta?formula=${F}&lugar=celdas.c1&referencia=r`,
    )
    expect(
      destinoDeLaFormulaVieja(O, F, 'planilla', { panel: 'revertir-formula', version: '2' }),
    ).toBe(`${BASE}/planilla?formula=${F}&panel=revertir-formula&version=2`)
  })

  it('el panel de una fórmula pasa a `cual`; los paneles que ya no existen se van', () => {
    expect(
      destinoDeLaFormulaVieja(O, F, 'planilla', { panel: 'renombrar-formula', formula: F }),
    ).toBe(`${BASE}/planilla?formula=${F}&panel=renombrar-formula&cual=${F}`)
    expect(destinoDeLaFormulaVieja(O, F, 'planilla', { panel: 'editar-formula', fila: 'n1' })).toBe(
      `${BASE}/planilla?formula=${F}&fila=n1`,
    )
  })
})

describe('destinoSinFormula', () => {
  it('la lista y las rutas cortas van a su pestaña sin `?formula=`, con los paneles traducidos', () => {
    expect(destinoSinFormula(O, 'planilla', {})).toBe(`${BASE}/planilla`)
    expect(destinoSinFormula(O, 'planilla', { panel: 'activar-formula', formula: F })).toBe(
      `${BASE}/planilla?panel=activar-formula&cual=${F}`,
    )
    expect(destinoSinFormula(O, 'planilla', { panel: 'nueva-formula', copia: F })).toBe(
      `${BASE}/planilla?panel=nueva-formula&copia=${F}`,
    )
    expect(destinoSinFormula(O, 'hoja', { vista: '412' })).toBe(`${BASE}/hoja?vista=412`)
    expect(destinoSinFormula(O, 'tarjeta', {})).toBe(`${BASE}/tarjeta`)
  })
})

describe('destinoDeLasTablasViejas', () => {
  it('el drawer de las tablas sobre la Planilla, con la tabla y su panel en `accion`', () => {
    expect(destinoDeLasTablasViejas(O, {})).toBe(`${BASE}/planilla?panel=tablas`)
    expect(destinoDeLasTablasViejas(O, { tabla: 't-1', panel: 'publicar-tabla' })).toBe(
      `${BASE}/planilla?panel=tablas&tabla=t-1&accion=publicar-tabla`,
    )
  })
})
