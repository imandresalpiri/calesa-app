import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { abrir, BASE, celda } from './xcell.soporte'
import { IDS_DE_ICONOS_DE_XCELL, SimbolosDeXCell } from './simbolos-de-xcell'
import { ProveedorRegional } from '../regional'
import { XCell, type XCellProps } from './index'

afterEach(cleanup)

// La geometría y los colores de la raíz, iguales en toda celda, viven en `xcell.css` (una vez por página): ahí se leen.
const CSS = readFileSync(join(process.cwd(), 'src/shared/ui/xcell/xcell.css'), 'utf8')

describe('los estados', () => {
  it('normal: sin punto, sin ↺ y sin candado', () => {
    const c = celda()
    expect(c.raiz.dataset['estado']).toBe('normal')
    expect(c.raiz.textContent).not.toContain('Sugerido')
    expect(c.parada(13)).toBeNull()
    expect(c.raiz.querySelector('p')).toBeNull()
    expect(c.raiz.querySelector('[role="img"]')).toBeNull()
  })

  it('sugerido: el punto, dicho también en texto', () => {
    const c = celda({ suggested: true })
    expect(c.raiz.dataset['estado']).toBe('sugerido')
    expect(c.raiz.querySelector('[aria-hidden][title="Sugerido"]')).not.toBeNull()
    expect(c.raiz.textContent).toContain('Sugerido')
  })

  it('modificado: ↺ que dice a qué vuelve, sin la cifra', () => {
    const conDefecto = celda({ overridden: true, defaultValue: 100 })
    expect(conDefecto.raiz.dataset['estado']).toBe('modificado')
    const boton = conDefecto.parada(13)
    expect(boton?.getAttribute('aria-label')).toBe('Volver al valor por defecto de Fees')
    expect(conDefecto.raiz.textContent).not.toContain('100')
    cleanup()
    const sinDefecto = celda({ overridden: true })
    expect(sinDefecto.parada(13)?.getAttribute('aria-label')).toBe('Volver al sugerido de Fees')
  })

  it('modificado no muestra el punto de sugerido', () => {
    const c = celda({ suggested: true, overridden: true })
    expect(c.raiz.dataset['estado']).toBe('modificado')
    expect(c.raiz.textContent).not.toContain('Sugerido')
  })

  it('nunca dice «Sugerido:» junto a nada, en ningún estado', () => {
    const casos: Partial<XCellProps>[] = [
      {},
      { suggested: true },
      { overridden: true, suggested: true },
      { overridden: true, defaultValue: 5 },
      { disabledReason: 'Apagado' },
      { error: 'Fuera de rango' },
      { secondaryId: 'p', secondaryFormat: 'porcentaje', secondaryValue: 0.1, suggested: true },
    ]
    for (const caso of casos) {
      const c = celda(caso)
      expect(c.raiz.textContent, JSON.stringify(caso)).not.toMatch(/Sugerido\s*:/i)
      expect(c.raiz.innerHTML, JSON.stringify(caso)).not.toMatch(/Sugerido\s*:/i)
      cleanup()
    }
  })

  it('un valor vacío dice «Sin valor»', () => {
    const c = celda({ value: null })
    expect(c.raiz.textContent).toContain('Sin valor')
  })

  it('un porcentaje y un número se escriben con el locale', () => {
    expect(celda({ format: 'porcentaje', value: 0.1494 }).raiz.textContent).toContain('14,94')
    cleanup()
    expect(celda({ format: 'numero', value: 12.2 }).raiz.textContent).toContain('12,2')
  })
})

describe('deshabilitada', () => {
  const motivo = 'Se apaga cuando no hay garantía'

  it('el candado va en las acciones con su motivo de nombre y de descripción del valor, sin una nota escrita, y se alcanza con el teclado', () => {
    const c = celda({ disabledReason: motivo })
    expect(c.raiz.dataset['estado']).toBe('deshabilitado')
    expect(c.raiz.querySelector('p')).toBeNull()
    const candado = screen.getByRole('img', { name: motivo })
    expect(candado.querySelector('use')?.getAttribute('href')).toBe('#xcell-candado')
    expect(candado.getAttribute('tabindex')).toBe('-1')
    expect(candado.getAttribute('data-parada')).toBe('10')
    // El globo es el `::after` del mismo nodo: lee su `aria-label`.
    expect(candado.className).toContain('after:content-[attr(aria-label)]')
    const boton = c.parada(0)
    expect(boton?.getAttribute('aria-disabled')).toBe('true')
    expect(boton?.hasAttribute('disabled')).toBe(false)
    // La descripción del valor es el `aria-label` del candado que nombra (accname, paso 2C). jsdom (dom-accessibility-api) no lee el `aria-label` de un
    // nodo referido al describir: Chromium sí, y lo prueba `e2e/xcell-teclado.spec.ts` por CDP.
    expect(boton?.getAttribute('aria-describedby')).toBe(candado.id)
    boton?.focus()
    expect(document.activeElement).toBe(boton)
  })

  it('el error queda escrito bajo la celda (`role=alert`) y convive con el candado', () => {
    const c = celda({ disabledReason: motivo, error: 'Fuera de rango' })
    const alerta = c.raiz.querySelector('p[role="alert"]')
    expect(alerta?.textContent).toBe('Fuera de rango')
    const candado = screen.getByRole('img', { name: motivo })
    expect(c.parada(0)?.getAttribute('aria-describedby')).toBe(`${alerta?.id ?? ''} ${candado.id}`)
  })

  it('no abre la edición: ni con un clic ni tipeando ni con F2', () => {
    const c = celda({ disabledReason: motivo })
    const boton = c.parada(0)
    if (!boton) throw new Error('sin botón')
    fireEvent.click(boton)
    fireEvent.keyDown(boton, { key: '5' })
    fireEvent.keyDown(boton, { key: 'F2' })
    fireEvent.keyDown(boton, { key: 'Backspace' })
    expect(c.entrada()).toBeNull()
  })

  it('no ofrece ↺ aunque venga modificada', () => {
    const c = celda({ disabledReason: motivo, overridden: true })
    expect(c.parada(13)).toBeNull()
  })

  it('un motivo muy largo queda entero en el nombre del candado, y su globo lo parte', () => {
    const largo = 'No se puede editar porque '.repeat(20).trim()
    const c = celda({ disabledReason: largo })
    const candado = c.raiz.querySelector('[role="img"]')
    expect(candado?.getAttribute('aria-label')).toBe(largo)
    expect(candado?.className).toContain('after:whitespace-normal')
    expect(candado?.className).toContain('after:max-w-64')
  })

  it('si se deshabilita mientras se edita, la edición se va', () => {
    const c = celda()
    abrir(c)
    c.rerender(<XCell {...BASE} disabledReason="Apagado" />)
    expect(c.entrada()).toBeNull()
  })
})

describe('el tono', () => {
  it('lleva la clave en data-tono y lee los colores de las variables, con el neutro de respaldo', () => {
    const c = celda({ tone: 'amarillo' })
    expect(c.raiz.dataset['tono']).toBe('amarillo')
    expect(c.raiz.hasAttribute('data-xcell')).toBe(true)
    expect(CSS).toContain('bg-[color:var(--tono-fondo,var(--color-surface))]')
    expect(CSS).toContain('border-[color:var(--tono-borde,var(--color-line-strong))]')
    expect(CSS).toContain('text-[color:var(--tono-tinta,var(--color-ink))]')
  })

  it('una clave desconocida no rompe nada y se dibuja igual', () => {
    const c = celda({ tone: 'no_existe' })
    expect(c.raiz.dataset['tono']).toBe('no_existe')
    expect(c.raiz.textContent).toContain('1.234,57')
  })

  it('sin tono no pone el atributo', () => {
    expect(celda().raiz.hasAttribute('data-tono')).toBe(false)
  })

  it('ningún color está escrito a mano en las clases', () => {
    const c = celda({ overridden: true, suggested: true, disabledReason: 'x', error: 'y' })
    expect(c.raiz.innerHTML).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(|hsl\(/i)
    expect(CSS).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(|hsl\(/i)
  })
})

describe('la etiqueta', () => {
  it('muy larga: se corta con «…» y el texto completo va en `title` (y en el nombre del grupo); el valor nunca se corta', () => {
    const largo = 'Impuesto interno de importación de vehículos usados '.repeat(5).trim()
    const c = celda({ label: largo })
    const etiqueta = c.raiz.querySelector(`[id$="e"]`)
    expect(etiqueta?.textContent).toBe(largo)
    expect(etiqueta?.getAttribute('title')).toBe(largo)
    expect(etiqueta?.className).toContain('truncate')
    expect(screen.getByRole('group', { name: largo })).toBeTruthy()
    const valor = c.raiz.querySelector('[data-parada="0"]')
    expect(valor?.className).toContain('whitespace-nowrap')
    expect(valor?.className).toContain('shrink-0')
    expect(valor?.className).not.toMatch(/truncate|text-ellipsis/)
  })

  it('el monto va grande en la monoespaciada y en negrita; el porcentaje de un par, chico y de peso normal', () => {
    const c = celda({ secondaryId: 'pct', secondaryFormat: 'porcentaje', secondaryValue: 0.1 })
    const monto = c.raiz.querySelector('[data-parada="0"]')
    const porcentaje = c.raiz.querySelector('[data-parada="1"]')
    expect(monto?.className).toMatch(/\bfont-mono\b/)
    expect(monto?.className).toMatch(/\btabular-nums\b/)
    expect(monto?.className).toMatch(/\bfont-bold\b/)
    expect(monto?.className).toContain('var(--xcell-letra-valor,calc(var(--text-sm)*1.5))')
    expect(porcentaje?.className).toContain('text-(length:--text-sm)')
    expect(porcentaje?.className).toMatch(/\bfont-normal\b/)
    expect(porcentaje?.className).toContain('var(--color-ink-soft)')
  })

  it('sin valor: «Sin valor» en la letra del texto (`data-vacio`), sin cambiar el alto', () => {
    const c = celda({ value: null })
    const valor = c.parada(0)
    expect(valor?.textContent).toBe('Sin valor')
    expect(valor?.hasAttribute('data-vacio')).toBe(true)
    expect(valor?.className).toContain('data-[vacio]:font-sans')
    expect(CSS).toContain('min-h-[var(--xcell-alto,56px)]')
    cleanup()
    expect(celda().parada(0)?.hasAttribute('data-vacio')).toBe(false)
  })

  it('el grupo se llama como la etiqueta', () => {
    celda({ label: 'Flete marítimo' })
    expect(screen.getByRole('group', { name: 'Flete marítimo' })).toBeTruthy()
  })
})

describe('los iconos del sprite', () => {
  it('cada <use> de la celda apunta a un id que el sprite define', () => {
    const casos: Partial<XCellProps>[] = [
      { overridden: true },
      { disabledReason: 'Apagado' },
      { error: 'Mal' },
      {
        overridden: true,
        hasHelp: true,
        onHelp: () => undefined,
        hasSettings: true,
        onSettings: () => undefined,
      },
    ]
    for (const caso of casos) {
      const { container } = render(
        <>
          <SimbolosDeXCell />
          <XCell {...BASE} {...caso} />
        </>,
      )
      const usados = [...container.querySelectorAll('[data-xcell] use')].map((u) =>
        u.getAttribute('href'),
      )
      expect(usados.length).toBeGreaterThan(0)
      for (const href of usados) {
        expect(container.querySelector(`defs ${href ?? '#nada'}`), String(href)).not.toBeNull()
      }
      cleanup()
    }
  })

  it('cada id de IDS_DE_ICONOS_DE_XCELL existe en el sprite, con trazo', () => {
    const { container } = render(<SimbolosDeXCell />)
    for (const id of IDS_DE_ICONOS_DE_XCELL) {
      const grupo = container.querySelector(`defs #${id}`)
      expect(grupo, id).not.toBeNull()
      expect(grupo?.children.length, id).toBeGreaterThan(0)
    }
  })
})

// 4-25: la celda lee con el locale de la empresa, no con el de fábrica.
describe('lo tipeado, con el locale de la empresa', () => {
  it('en en-US «1.234,5» no se emite y el aviso lo dice con el punto decimal', () => {
    const onCommit = () => {
      throw new Error('no tenía que emitir')
    }
    const { container } = render(
      <ProveedorRegional locale="en-US" monedaBase="USD" zonaHoraria="America/La_Paz">
        <XCell {...BASE} onCommit={onCommit} />
      </ProveedorRegional>,
    )
    const boton = container.querySelector<HTMLElement>('[data-parada="0"]') as HTMLElement
    fireEvent.click(boton)
    const entrada = container.querySelector('input') as HTMLInputElement
    fireEvent.change(entrada, { target: { value: '1.234,5' } })
    fireEvent.keyDown(entrada, { key: 'Enter' })
    expect(container.querySelector('[role="alert"]')?.textContent).toBe(
      'Usa punto para los decimales y la coma sólo para los miles: 1,234.5.',
    )
    fireEvent.change(container.querySelector('input') as HTMLInputElement, {
      target: { value: 'abc' },
    })
    fireEvent.keyDown(container.querySelector('input') as HTMLInputElement, { key: 'Enter' })
    expect(container.querySelector('[role="alert"]')?.textContent).toBe(
      'Escribe un número, por ejemplo 1234.5.',
    )
  })
})
