import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ProveedorRegional } from '../regional'
import { PARADA_DE_RESTABLECER } from './cabecera-de-xcell'
import { ID_DE_EDITADO, ID_DEL_ATAJO } from './simbolos-de-xcell'
import { BASE, celda } from './xcell.soporte'
import { XCell, type XCellProps } from './index'

afterEach(cleanup)

// Un cálculo pisado (`docs/COTIZADOR.md` › «Pisar un cálculo»): el binding manda `overridden` y `handEdited`, y lo calculado cuando llegó.
const PISADA: Partial<XCellProps> = { overridden: true, handEdited: true }

const marcaDe = (raiz: HTMLElement) =>
  raiz.querySelector<HTMLElement>('[role="img"][aria-label="Editado a mano"]')

describe('la marca «Editado a mano»', () => {
  it('la marca: el lápiz del sprite con su nombre y su title, primero en la fila de acciones y sin parada', () => {
    const c = celda({
      ...PISADA,
      secondaryId: 'p',
      secondaryFormat: 'porcentaje',
      secondaryValue: 0.1,
      secondaryDisabledReason: 'Nivel',
    })
    const marca = marcaDe(c.raiz)
    expect(marca?.getAttribute('title')).toBe('Editado a mano')
    expect(marca?.querySelector('use')?.getAttribute('href')).toBe(`#${ID_DE_EDITADO}`)
    expect(marca?.hasAttribute('data-parada')).toBe(false)
    expect(marca?.hasAttribute('tabindex')).toBe(false)
    // Antes del candado del porcentaje y de ↺, en la misma ranura.
    const ranura = marca?.parentElement
    expect(ranura?.firstElementChild).toBe(marca)
    expect(ranura?.querySelector('[aria-label="Nivel"]')).not.toBeNull()
    expect(c.parada(PARADA_DE_RESTABLECER)?.getAttribute('aria-label')).toBe(
      'Volver al calculado de Fees',
    )
  })

  it('sin `handEdited` no hay marca ni nota, aunque llegue lo calculado; modificada a secas tampoco', () => {
    const sinMarca = celda({ overridden: true, calculatedValue: 480 })
    expect(marcaDe(sinMarca.raiz)).toBeNull()
    expect(sinMarca.raiz.textContent).not.toContain('Calculado')
    expect(sinMarca.raiz.querySelector('p')).toBeNull()
  })
})

describe('lo calculado de una celda pisada', () => {
  it('«Calculado: $480» bajo la celda, con `<Monto>` (Modo Live), sin ser un aviso; describe a los dos lados', () => {
    const { container } = render(
      <ProveedorRegional locale="en-US" monedaBase="USD" zonaHoraria="America/La_Paz">
        <XCell
          {...BASE}
          {...PISADA}
          value={500}
          calculatedValue={480}
          secondaryId="p"
          secondaryFormat="porcentaje"
          secondaryValue={0.05}
        />
      </ProveedorRegional>,
    )
    const nota = [...container.querySelectorAll('p')].find((p) =>
      p.textContent.startsWith('Calculado:'),
    )
    expect(nota?.getAttribute('role')).toBeNull()
    expect(nota?.querySelector('[data-monto-valor]')?.textContent).toBe('$480.00')
    expect(nota?.querySelector('[data-monto-sin-moneda]')?.textContent).toBe('480.00')
    const marca = container.querySelector('[role="img"][aria-label="Editado a mano"]')
    for (const parada of ['0', '1']) {
      const boton = container.querySelector(`[data-parada="${parada}"]`)
      expect(boton?.getAttribute('aria-describedby')).toBe(
        `${marca?.id ?? ''} ${nota?.id ?? ''} ${ID_DEL_ATAJO}`,
      )
    }
  })

  it('lo calculado en su formato y sus decimales; sin valor, «Calculado: —»; sin la respuesta, sólo la marca', () => {
    const pct = celda({
      ...PISADA,
      calculatedValue: 0.04213,
      calculatedFormat: 'porcentaje',
      calculatedDecimals: 1,
    })
    const notaPct = [...pct.raiz.querySelectorAll('p')].find((p) =>
      p.textContent.startsWith('Calculado:'),
    )
    expect(notaPct?.textContent).toMatch(/^Calculado: 4[.,]2\s?%$/)
    // Un porcentaje no es dinero: sin `<Monto>`.
    expect(notaPct?.querySelector('[data-monto]')).toBeNull()
    cleanup()
    const sinValor = celda({ ...PISADA, calculatedValue: null })
    expect(sinValor.raiz.textContent).toContain('Calculado: —')
    cleanup()
    const esperando = celda(PISADA)
    expect(marcaDe(esperando.raiz)).not.toBeNull()
    expect(esperando.raiz.textContent).not.toContain('Calculado')
  })

  it('con todos los lados bloqueados la marca sigue (lo pisado se ve) y ↺ se va', () => {
    const c = celda({ ...PISADA, calculatedValue: 480, disabledReason: 'Lo edita Costos' })
    expect(marcaDe(c.raiz)).not.toBeNull()
    expect(c.raiz.textContent).toContain('Calculado:')
    expect(c.parada(PARADA_DE_RESTABLECER)).toBeNull()
  })
})

// Los nodos (`xcell-hoja.test.tsx` fija los de las demás): lo pisado suma sólo en esa celda; los topes de 300 celdas se miden sin pisar.
describe('los nodos de una celda pisada', () => {
  const nodos = (props: Partial<XCellProps>) => celda(props).raiz.querySelectorAll('*').length + 1

  it('la marca suma 3 y «Calculado», 4 con dinero (el `<Monto>`) o 1 sin él: modificada y pisada con lo calculado, 17', () => {
    expect(nodos({ overridden: true })).toBe(10)
    cleanup()
    expect(nodos(PISADA)).toBe(13)
    cleanup()
    expect(nodos({ ...PISADA, calculatedValue: 480 })).toBe(17)
    cleanup()
    expect(nodos({ ...PISADA, calculatedValue: 0.04, calculatedFormat: 'porcentaje' })).toBe(14)
    cleanup()
    expect(nodos({ ...PISADA, calculatedValue: null })).toBe(14)
  })
})
