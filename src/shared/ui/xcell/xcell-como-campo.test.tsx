import { cleanup, fireEvent } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { abrir, celda } from './xcell.soporte'
import type { XCellProps } from './index'

afterEach(cleanup)

const PAR: Partial<XCellProps> = {
  id: 'iva',
  label: 'IVA',
  value: 181,
  secondaryId: 'iva_pct',
  secondaryFormat: 'porcentaje',
  secondaryValue: 0.1494,
}
const MOTIVO = 'Se activa con el interruptor de garantía.'

const rotulo = (c: ReturnType<typeof celda>) => c.raiz.querySelector<HTMLElement>('[id$="e"]')
const candado = (c: ReturnType<typeof celda>) =>
  c.raiz.querySelector<HTMLElement>('[data-parada="10"]')

// Toda la celda es el campo: el rótulo y el fondo abren la edición como el valor, y lo que ya es un control se ocupa solo.
describe('la celda entera como campo', () => {
  it('tocar el rótulo o el fondo abre la edición con todo seleccionado', () => {
    const c = celda()
    fireEvent.click(rotulo(c) as HTMLElement)
    expect(c.entrada()?.dataset['seleccion']).toBe('todo')
    expect(c.entrada()?.value).toBe('1234,567')
    cleanup()
    const d = celda()
    fireEvent.click(d.raiz)
    expect(d.entrada()?.dataset['seleccion']).toBe('todo')
  })

  it('con el secundario grande (`secondaryProminent`), el fondo abre el secundario', () => {
    const c = celda({ ...PAR, secondaryProminent: true })
    fireEvent.click(c.raiz)
    expect(c.entrada()?.getAttribute('aria-label')).toBe('IVA, porcentaje')
  })

  it('⚙, la ayuda, ↺, el lápiz y el candado no abren la edición', () => {
    const c = celda({
      ...PAR,
      overridden: true,
      handEdited: true,
      secondaryDisabledReason: MOTIVO,
      hasHelp: true,
      onHelp: () => undefined,
      hasSettings: true,
      onSettings: () => undefined,
    })
    for (const selector of [
      '[data-parada="10"]',
      '[data-parada="11"]',
      '[data-parada="12"]',
      '[role="img"][title="Editado a mano"]',
    ]) {
      fireEvent.click(c.raiz.querySelector(selector) as HTMLElement)
      expect(c.entrada(), selector).toBeNull()
    }
    fireEvent.click(c.raiz.querySelector('[data-parada="13"]') as HTMLElement)
    expect(c.onReset).toHaveBeenCalledWith('iva')
    expect(c.entrada(), '↺').toBeNull()
  })

  it('con la edición abierta, el `mousedown` en el rótulo o el fondo se frena (la entrada no pierde el foco) y en un control no', () => {
    const c = celda({ ...PAR })
    const entrada = abrir(c)
    expect(fireEvent.mouseDown(rotulo(c) as HTMLElement)).toBe(false)
    expect(fireEvent.mouseDown(c.raiz)).toBe(false)
    fireEvent.click(rotulo(c) as HTMLElement)
    expect(c.entrada()).toBe(entrada)
    expect(fireEvent.mouseDown(c.parada(1) as HTMLElement)).toBe(true)
    cleanup()
    // Sin edición, nada se frena.
    const d = celda()
    expect(fireEvent.mouseDown(rotulo(d) as HTMLElement)).toBe(true)
  })
})

describe('una bloqueada muestra su motivo', () => {
  it('tocar el rótulo, el fondo o el valor no abre y enfoca su candado', () => {
    const c = celda({ disabledReason: MOTIVO })
    for (const blanco of [rotulo(c), c.raiz, c.parada(0)]) {
      ;(c.raiz.ownerDocument.activeElement as HTMLElement | null)?.blur()
      fireEvent.click(blanco as HTMLElement)
      expect(c.entrada()).toBeNull()
      expect(c.raiz.ownerDocument.activeElement).toBe(candado(c))
    }
    expect(candado(c)?.getAttribute('aria-label')).toBe(MOTIVO)
  })

  it('un par con un lado bloqueado: el fondo abre el libre y el valor bloqueado enfoca su candado', () => {
    const c = celda({ ...PAR, disabledReason: MOTIVO })
    fireEvent.click(c.raiz)
    expect(c.entrada()?.getAttribute('aria-label')).toBe('IVA, porcentaje')
    cleanup()
    const d = celda({ ...PAR, disabledReason: MOTIVO })
    fireEvent.click(d.parada(0) as HTMLElement)
    expect(d.entrada()).toBeNull()
    expect(d.raiz.ownerDocument.activeElement).toBe(candado(d))
  })

  it('el lado que abre un toque en el fondo lleva `data-blanco`; con todos bloqueados, ninguno', () => {
    const c = celda({ ...PAR, disabledReason: MOTIVO })
    expect(c.parada(0)?.hasAttribute('data-blanco')).toBe(false)
    expect(c.parada(1)?.hasAttribute('data-blanco')).toBe(true)
    cleanup()
    const d = celda({ disabledReason: MOTIVO })
    expect(d.parada(0)?.hasAttribute('data-blanco')).toBe(false)
  })
})
