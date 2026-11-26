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
      fireEvent.click(blanco as HTMLElement, { detail: 1 })
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
    fireEvent.click(d.parada(0) as HTMLElement, { detail: 1 })
    expect(d.entrada()).toBeNull()
    expect(d.raiz.ownerDocument.activeElement).toBe(candado(d))
  })

  it('Enter o Espacio en un lado bloqueado (el clic del teclado, `detail` 0) no abre ni mueve el foco: el motivo ya está en su descripción', () => {
    const c = celda({ ...PAR, disabledReason: MOTIVO })
    const boton = c.parada(0) as HTMLElement
    boton.focus()
    fireEvent.click(boton)
    expect(c.entrada()).toBeNull()
    expect(c.raiz.ownerDocument.activeElement).toBe(boton)
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

// La nota y «Calculado» van dentro de la celda, en la línea del rótulo: después de él en el DOM (el orden en que se ven y se leen), con el texto entero en
// `title` y en el globo de la raíz (`data-aviso`).
describe('la línea de la nota, dentro de la celda', () => {
  it('el aviso y «Calculado» van justo después del rótulo, con su `title`; la raíz lleva `data-par` y `data-aviso`', () => {
    const c = celda({
      ...PAR,
      error: 'Tiene que ser menor que el precio de subasta.',
      handEdited: true,
      calculatedValue: 0.2,
      calculatedFormat: 'porcentaje',
    })
    const hijos = [...c.raiz.children]
    const desde = hijos.indexOf(rotulo(c) as HTMLElement)
    const [nota, calculado] = hijos.slice(desde + 1, desde + 3)
    expect(nota?.getAttribute('role')).toBe('alert')
    expect(nota?.getAttribute('title')).toBe('Tiene que ser menor que el precio de subasta.')
    expect(calculado?.textContent).toBe('Calculado: 20%')
    expect(calculado?.getAttribute('title')).toBe('Calculado: 20%')
    expect(hijos.indexOf(c.parada(0) as HTMLElement)).toBeGreaterThan(desde + 2)
    expect(c.raiz.hasAttribute('data-par')).toBe(true)
    expect(c.raiz.getAttribute('data-aviso')).toBe('Tiene que ser menor que el precio de subasta.')
    cleanup()
    const d = celda()
    expect(d.raiz.hasAttribute('data-par')).toBe(false)
    expect(d.raiz.hasAttribute('data-aviso')).toBe(false)
  })

  it('el aviso de lo tipeado también va en `data-aviso`', () => {
    const c = celda()
    const entrada = abrir(c)
    fireEvent.change(entrada, { target: { value: 'abc' } })
    fireEvent.keyDown(entrada, { key: 'Enter' })
    expect(c.raiz.getAttribute('data-aviso')).toMatch(/^Escribe un número/)
  })
})

// Apagada como un campo deshabilitado, sin bajar el contraste del valor: la opacidad va sólo en el rótulo y el punto (el AA del valor, `ink-soft` sobre
// `surface-2`, lo fija `design/tokens.test.ts`).
describe('inactiva o bloqueada, apagada', () => {
  it('ninguna opacidad en la raíz ni en los botones del valor; sí en el rótulo y el punto', () => {
    const c = celda({
      ...PAR,
      suggested: true,
      disabledReason: MOTIVO,
      secondaryDisabledReason: MOTIVO,
    })
    expect(c.raiz.dataset['estado']).toContain('deshabilitado')
    expect(c.raiz.className).not.toMatch(/(^|\s)opacity-/)
    for (const n of [0, 1]) expect(c.parada(n)?.className).not.toMatch(/opacity-/)
    expect(rotulo(c)?.className).toContain('group-data-[estado~=deshabilitado]/xc:opacity-60')
    expect(c.raiz.querySelector('[title="Sugerido"]')?.className).toContain(
      'group-data-[estado~=deshabilitado]/xc:opacity-60',
    )
  })

  it('un solo lado bloqueado: sólo su caja va apagada y no se ilumina al pasar el puntero', () => {
    const c = celda({ ...PAR, disabledReason: MOTIVO })
    expect(c.parada(0)?.className).toContain('bg-(--color-surface-2)')
    expect(c.parada(0)?.className).toContain('not-aria-disabled:hover:')
    expect(c.parada(1)?.className).not.toContain('bg-(--color-surface-2)')
  })
})
