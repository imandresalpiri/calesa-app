import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Formula } from '../../../entities/formula'
import type { FormulaParaEditar } from '../../../entities/formula/edicion'
import type * as ModuloDelTextoVigente from '../../../entities/formula/texto-vigente'
import type * as ModuloDeValidar from '../../../entities/validar'
import { conElAjuste, formulaDePrueba } from '../../../entities/formula/fila-de-prueba.soporte'
import { textoVigente } from '../../../entities/formula/texto-vigente'
import { validarFormula } from '../../../entities/validar'
import { aplicarEnLaFila } from './aplicar-en-la-fila.soporte'
import { useEditorDeLaFormula } from './use-editor-de-la-formula'

// «Guardar el borrador» (4.21-3b-1): la action no llega aquí (su composición es del servidor).
vi.mock('../actions/guardar-borrador', () => ({
  guardarBorrador: () => Promise.resolve(undefined),
}))

// `validarFormula()` y `textoVigente()` envueltas, llamando a las reales: para contar cuándo se llaman.
vi.mock('../../../entities/validar', async (original) => {
  const real = await original<typeof ModuloDeValidar>()
  return { ...real, validarFormula: vi.fn(real.validarFormula) }
})
vi.mock('../../../entities/formula/texto-vigente', async (original) => {
  const real = await original<typeof ModuloDelTextoVigente>()
  return { ...real, textoVigente: vi.fn(real.textoVigente) }
})
// Lo de prueba de la vista previa (4.21-3a-2): sin red, un tipo de cambio y ninguna tabla.
vi.mock('../../../areas/formula/composicion.client', () => ({
  leerElTerrenoDePrueba: () =>
    Promise.resolve({
      ok: true as const,
      data: {
        tipos_cambio: { oficial: 6.96 },
        monedas: { oficial: 'BOB' },
        tablas: {},
        avisos: [],
      },
    }),
}))
type Accion = { etiqueta: string; alHacer: () => void }
const avisos: { mensaje: string; accion?: Accion }[] = []
vi.mock('@/shared/ui/toasts', () => ({
  avisar: (mensaje: string, accion?: Accion) => {
    avisos.push({ mensaje, ...(accion ? { accion } : {}) })
  },
}))

const ORIGEN = '11111111-1111-4111-8111-111111111111'
const FORMULA = '22222222-2222-4222-8222-222222222222'
const HORA = '2026-11-07T15:00:00.123456+00:00'

const formula = () =>
  formulaDePrueba([
    { id: 'base', texto: '=remate+fees', etiqueta: 'Base' },
    { id: 'total', texto: '=(remate+fees)*4%', etiqueta: 'Total' },
  ])
const leidaDe = (f: Formula, hora = HORA): FormulaParaEditar => ({
  id: FORMULA,
  formulaDelOrigenId: '44444444-4444-4444-8444-444444444444',
  actualizadoEn: hora,
  estado: 'borrador',
  diseno: null,
  nota: null,
  formula: f,
})
const montar = (leida: FormulaParaEditar = leidaDe(formula())) =>
  renderHook(({ l }) => useEditorDeLaFormula({ origenId: ORIGEN, leida: l }), {
    initialProps: { l: leida },
  })
const textoDe = (r: ReturnType<typeof montar>['result'], id: string) =>
  r.current.filas.find((f) => f.id === id)?.texto

beforeEach(() => {
  window.sessionStorage.clear()
  avisos.length = 0
  vi.mocked(validarFormula).mockClear()
  vi.mocked(textoVigente).mockClear()
})

describe('useEditorDeLaFormula: cambiar la fórmula de trabajo (T3)', () => {
  it('lo aplicado cambia la fórmula de trabajo, sus filas y lo que se aplicó', () => {
    const { result } = montar()
    const { entro } = aplicarEnLaFila(result, 'base', '=remate+flete')
    expect(entro).toBe(true)
    expect(textoDe(result, 'base')).toEqual({ modo: 'texto', texto: '=remate+flete' })
    expect(result.current.aplicada).toEqual({ id: 'base', soltados: [] })
  })

  it('abrir una fila la marca (nada libre) y cerrar la suelta sin cambiar la fórmula', () => {
    const { result } = montar()
    expect(result.current.libre).toBe(true)
    act(() => {
      result.current.abrir('base')
    })
    expect(result.current.abierta).toBe('base')
    expect(result.current.libre).toBe(false)
    act(() => {
      result.current.cerrar()
    })
    expect(result.current.abierta).toBeNull()
    expect(result.current.libre).toBe(true)
    expect(textoDe(result, 'base')).toEqual({ modo: 'texto', texto: '=remate+fees' })
  })

  it('volver a dibujar sin cambiar la fórmula (abrir una fila, tipear en ella) no recalcula las filas ni valida', () => {
    const leida = leidaDe(formula())
    const { result, rerender } = montar(leida)
    vi.mocked(validarFormula).mockClear()
    vi.mocked(textoVigente).mockClear()
    act(() => {
      result.current.abrir('base')
    })
    rerender({ l: leida })
    rerender({ l: leida })
    expect(textoVigente).not.toHaveBeenCalled()
    expect(validarFormula).not.toHaveBeenCalled()
  })
})

describe('useEditorDeLaFormula: en sólo lectura (Modo Live)', () => {
  it('nada cambia la fórmula de trabajo ni abre una fila, y sigue libre (abrir una celda dice su motivo)', () => {
    const leida = leidaDe(formula())
    const { result } = renderHook(() =>
      useEditorDeLaFormula({ origenId: ORIGEN, leida, soloLectura: true }),
    )
    expect(result.current.soloLectura).toBe(true)
    let entro = true
    act(() => {
      entro = result.current.cambiar(
        formulaDePrueba([{ id: 'otra', texto: '=1', etiqueta: 'Otra' }]),
      )
    })
    expect(entro).toBe(false)
    act(() => {
      result.current.abrir('base')
    })
    expect(result.current.abierta).toBeNull()
    expect(result.current.libre).toBe(true)
    expect(result.current.trabajo).toBe(leida.formula)
  })
})

describe('useEditorDeLaFormula: pisar un ⚙ y validar (T3)', () => {
  it('4-5: con el texto que ya no manda, recompilar no pisa el ⚙ hasta «Pisar el valor»', () => {
    const { result } = montar(leidaDe(conElAjuste(formula(), 'total__2', -0.03)))
    expect(textoDe(result, 'total')).toMatchObject({ modo: 'no_manda' })
    const sinPisar = aplicarEnLaFila(result, 'total', '=(remate+fees)*4%')
    expect(sinPisar.r).toMatchObject({
      ok: false,
      error: {
        codigo: 'pisa_un_valor',
        cambios: [{ id: 'total__2', guardado: -0.03, nuevo: 0.04 }],
      },
    })
    expect(textoDe(result, 'total')).toMatchObject({ modo: 'no_manda' })
    aplicarEnLaFila(result, 'total', '=(remate+fees)*4%', true)
    expect(textoDe(result, 'total')).toEqual({ modo: 'texto', texto: '=(remate+fees)*4%' })
  })

  it('un texto que compila y deja la fórmula inválida aplica y pone el rechazo en su fila', () => {
    const { result } = montar()
    expect(result.current.rechazo).toBeNull()
    aplicarEnLaFila(result, 'total', 'SI(b; remate)')
    expect(result.current.rechazo).toEqual({
      mensaje: expect.stringContaining('El total «total» no puede depender') as unknown as string,
      filaId: 'total',
      grupoId: null,
    })
  })
})

describe('useEditorDeLaFormula: el borrador local (T3)', () => {
  it('lo aplicado se repone al volver a abrir la misma versión, con «Descartar»; otra versión no', () => {
    const primero = montar()
    aplicarEnLaFila(primero.result, 'base', '=remate+flete')
    primero.unmount()

    const segundo = montar()
    expect(textoDe(segundo.result, 'base')).toEqual({ modo: 'texto', texto: '=remate+flete' })
    const aviso = avisos.at(-1)
    expect(aviso?.accion?.etiqueta).toBe('Descartar')
    act(() => {
      aviso?.accion?.alHacer()
    })
    expect(textoDe(segundo.result, 'base')).toEqual({ modo: 'texto', texto: '=remate+fees' })
    segundo.unmount()

    const tercero = montar()
    aplicarEnLaFila(tercero.result, 'base', '=remate+flete')
    tercero.unmount()
    const otra = montar(leidaDe(formula(), '2026-11-07T16:00:00.000001+00:00'))
    expect(textoDe(otra.result, 'base')).toEqual({ modo: 'texto', texto: '=remate+fees' })
  })
})
