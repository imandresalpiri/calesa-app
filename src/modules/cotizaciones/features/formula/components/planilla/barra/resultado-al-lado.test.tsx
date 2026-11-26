import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { formulaDePrueba } from '../../../../../entities/formula/fila-de-prueba.soporte'
import { hojaDeLaPlanilla } from '../../../../../entities/formula/hoja-de-la-planilla'
import { TERRENO_VACIO } from '../../../../../entities/formula/terreno-de-prueba'
import { UNIDAD_EN_CEROS } from '../../../../../entities/formula/unidad-de-ejemplo'
import { PAUSA_DEL_RESULTADO_MS, useResultadoAlLado } from '../../../hooks/use-resultado-al-lado'
import { NOMBRE_DEL_RESULTADO, ResultadoAlLado } from './resultado-al-lado'

const formula = formulaDePrueba([{ id: 'cif', texto: '=remate+fees', destino: { formato: 'raw' } }])
const hoja = hojaDeLaPlanilla(formula)
const c = (id: string) => `C${String(hoja.numeroDe.get(id))}`
const editor = {
  trabajo: formula,
  tablas: null,
  lectura: { tipo: 'lista', terreno: { ...TERRENO_VACIO, tipos_cambio: { oficial: 7 } } } as const,
}
const unidad = { ...UNIDAD_EN_CEROS, inputs: { remate: 1000, fees: 100 } }

function Caja({ texto, col = 'C' }: { texto: string; col?: 'A' | 'C' }) {
  const resultado = useResultadoAlLado({
    edicion: { edicion: { id: 'cif', col, texto } },
    editor,
    hoja,
    unidad,
    calculo: { modo: undefined, locale: 'es-BO' },
  })
  return resultado.enC ? <ResultadoAlLado resultado={resultado} /> : null
}

const caja = () => screen.getByRole('status', { name: NOMBRE_DEL_RESULTADO })
const esperar = (ms: number) => {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

describe('ResultadoAlLado', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('nada antes de la pausa, la cifra después y nada otra vez al volver a tipear', () => {
    const { rerender } = render(<Caja texto={`=${c('remate')}+${c('fees')}`} />)
    expect(caja()).toBeEmptyDOMElement()
    esperar(PAUSA_DEL_RESULTADO_MS - 1)
    expect(caja()).toBeEmptyDOMElement()
    esperar(1)
    expect(caja()).toHaveTextContent('1.100')
    // Otra tecla: la cifra de antes ya no es la de lo tipeado.
    rerender(<Caja texto={`=${c('remate')}+${c('fees')}*`} />)
    expect(caja()).toBeEmptyDOMElement()
    rerender(<Caja texto={`=${c('remate')}+${c('fees')}*2`} />)
    esperar(PAUSA_DEL_RESULTADO_MS)
    expect(caja()).toHaveTextContent('1.200')
  })

  it('un texto que no compila deja la caja vacía, pero la caja sigue', () => {
    render(<Caja texto={`=(${c('remate')}`} />)
    esperar(PAUSA_DEL_RESULTADO_MS)
    expect(caja()).toBeEmptyDOMElement()
  })

  it('fuera de la C no hay caja', () => {
    render(<Caja texto="Flete" col="A" />)
    expect(screen.queryByRole('status', { name: NOMBRE_DEL_RESULTADO })).toBeNull()
  })
})
