import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { celdaDe, dibujarLaPlanilla, filasDibujadas } from '../planilla-de-prueba.soporte'

vi.mock('../../../actions/guardar-borrador', () => ({
  guardarBorrador: () => Promise.resolve(undefined),
}))
vi.mock('../../../../../areas/formula/composicion.client', () => ({
  leerElTerrenoDePrueba: () =>
    Promise.resolve({
      ok: true as const,
      data: { tipos_cambio: { oficial: 2 }, monedas: { oficial: 'BOB' }, tablas: {}, avisos: [] },
    }),
  leerTonosDelCatalogo: () => Promise.resolve({ ok: true as const, data: [] }),
}))
vi.mock('@/shared/ui/toasts', () => ({ avisar: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))

const FILAS = [
  { id: 'comision', texto: '=remate*4%', etiqueta: 'Comisión' },
  { id: 'despacho', texto: '=900', etiqueta: 'Despacho' },
  { id: 'total', texto: '=comision+despacho', etiqueta: 'Total' },
]

const grilla = () => screen.getByRole('grid', { name: 'Filas de la fórmula de Japón' })
const activa = () => grilla().getAttribute('aria-activedescendant')
const tecla = (key: string, extra: Partial<KeyboardEventInit> = {}) => {
  fireEvent.keyDown(grilla(), { key, ...extra })
}

beforeEach(() => {
  // jsdom no desplaza: la celda activa se lleva a la vista.
  Element.prototype.scrollIntoView = () => undefined
  window.sessionStorage.clear()
})
afterEach(cleanup)

describe('CuadriculaDeLaPlanilla: el teclado sobre la grilla (D19)', () => {
  it('la grilla es un solo lugar en el orden de Tab; las flechas y Tab mueven la celda activa', () => {
    dibujarLaPlanilla(FILAS)
    expect(grilla().tabIndex).toBe(0)
    fireEvent.click(celdaDe('despacho', 'C'))
    expect(activa()).toBe(celdaDe('despacho', 'C').id)
    tecla('ArrowDown')
    expect(activa()).toBe(celdaDe('total', 'C').id)
    tecla('ArrowUp')
    tecla('ArrowLeft')
    expect(activa()).toBe(celdaDe('despacho', 'B').id)
    tecla('Tab')
    expect(activa()).toBe(celdaDe('despacho', 'C').id)
    tecla('Tab', { shiftKey: true })
    expect(activa()).toBe(celdaDe('despacho', 'B').id)
  })

  it('F2 escribe en la celda activa con su texto; Esc descarta y la deja como estaba', () => {
    dibujarLaPlanilla(FILAS)
    fireEvent.click(celdaDe('despacho', 'C'))
    tecla('F2')
    const entrada = screen.getByRole('combobox', { name: /^C\d+, Despacho, valor$/ })
    expect((entrada as HTMLInputElement).value).toBe('900')
    expect(activa()).toBeNull()
    fireEvent.change(entrada, { target: { value: '950' } })
    fireEvent.keyDown(entrada, { key: 'Escape' })
    expect(screen.queryByRole('combobox', { name: /Despacho, valor/ })).toBeNull()
    expect(celdaDe('despacho', 'C').textContent).toContain('900')
    expect(activa()).toBe(celdaDe('despacho', 'C').id)
  })

  it('Alt+↑ sobre la grilla mueve la fila de la celda activa (no hace falta el asa); en la primera no hace nada', () => {
    dibujarLaPlanilla(FILAS)
    const antes = filasDibujadas()
    const i = antes.indexOf('despacho')
    fireEvent.click(celdaDe('despacho', 'A'))
    tecla('ArrowUp', { altKey: true })
    const despues = filasDibujadas()
    expect(despues.indexOf('despacho')).toBe(i - 1)
    expect(despues[i]).toBe(antes[i - 1])
    expect(activa()).toBe(celdaDe('despacho', 'A').id)
    const primera = despues[0]
    if (primera === undefined) throw new Error('Sin filas.')
    fireEvent.click(celdaDe(primera, 'A'))
    tecla('ArrowUp', { altKey: true })
    expect(filasDibujadas()).toEqual(despues)
  })

  it('las teclas en un botón de adentro (el «⋯» de la fila) no mueven la activa', () => {
    dibujarLaPlanilla(FILAS)
    fireEvent.click(celdaDe('despacho', 'C'))
    const menu = screen.getByRole('button', { name: /Acciones de la fila/ })
    fireEvent.keyDown(menu, { key: 'ArrowDown' })
    expect(activa()).toBe(celdaDe('despacho', 'C').id)
  })
})

describe('CuadriculaDeLaPlanilla: C guarda la fórmula y Ejemplo es la unidad de ejemplo', () => {
  it('la cabecera dice Ejemplo, sin letra; la misma cifra no se dibuja dos veces en una fila', async () => {
    dibujarLaPlanilla(FILAS)
    const titulos = screen.getAllByRole('columnheader').map((th) => th.textContent)
    expect(titulos).toContain('Ejemplo')
    expect(titulos.join(' ')).not.toContain('de dónde sale')
    // Un cálculo: su texto en C y la cifra en Ejemplo.
    expect(celdaDe('total', 'C').textContent).toMatch(/^=C\d+\+C\d+$/)
    await waitFor(() => {
      expect(celdaDe('total', 'D').textContent).toContain('900')
    })
    expect(celdaDe('total', 'C').textContent).not.toContain('900')
    // Un valor fijo: el número en C y Ejemplo vacío.
    expect(celdaDe('despacho', 'C').textContent).toContain('900')
    expect(celdaDe('despacho', 'D').textContent).toBe('')
  })

  it('lo que escribe el asesor se tipea en Ejemplo y cambia la suma; su C sigue diciendo de dónde sale', async () => {
    dibujarLaPlanilla(FILAS)
    expect(celdaDe('remate', 'C').textContent).toBe('lo escribe el asesor')
    fireEvent.click(celdaDe('remate', 'D'))
    tecla('F2')
    const entrada = screen.getByRole('combobox', { name: /^Ejemplo \d+, Remate$/ })
    fireEvent.change(entrada, { target: { value: '1000' } })
    fireEvent.keyDown(entrada, { key: 'Enter' })
    expect(celdaDe('remate', 'D').textContent).toContain('1.000')
    await waitFor(() => {
      expect(celdaDe('total', 'D').textContent).toContain('940')
    })
    expect(celdaDe('remate', 'C').textContent).toBe('lo escribe el asesor')
  })
})
