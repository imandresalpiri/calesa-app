import { act, cleanup, render, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { CLASE_LIVE } from './guion-live'
import { useLive } from './live'
import { Monto } from './monto'
import { useMontoEnTexto } from './monto-en-texto'
import { ProveedorRegional } from './regional'

afterEach(() => {
  cleanup()
  document.documentElement.classList.remove(CLASE_LIVE)
})

const plano = (texto: string) => texto.replace(/[\u00a0\u202f]/gu, ' ')

function Regional({ children }: { children: ReactNode }) {
  return (
    <ProveedorRegional locale="es-BO" monedaBase="USD" zonaHoraria="America/La_Paz">
      {children}
    </ProveedorRegional>
  )
}

function dibujar(props: Parameters<typeof Monto>[0]) {
  const { container } = render(<Monto {...props} />, { wrapper: Regional })
  return {
    con: plano(container.querySelector('[data-monto-valor]')?.textContent ?? ''),
    sin: container.querySelector('[data-monto-sin-moneda]')?.textContent ?? '',
    raiz: container,
  }
}

describe('<Monto>', () => {
  it('manda las dos versiones: con su moneda y, para el Modo Live, el número sin ella', () => {
    const { con, sin } = dibujar({ valor: 1234.5, moneda: 'USD' })
    expect(con).toBe('USD 1.234,50')
    expect(sin).toBe('1.234,50')
  })

  it('sin moneda, la base de la empresa; con decimales, los de la celda en las dos', () => {
    const { con, sin } = dibujar({ valor: 6.96, moneda: 'BOB', decimales: 3 })
    expect(con).toBe('Bs 6,960')
    expect(sin).toBe('6,960')
    cleanup()
    expect(dibujar({ valor: 10 }).con).toBe('USD 10,00')
  })

  it('con la moneda desconocida, el mismo número en las dos', () => {
    const { con, sin } = dibujar({ valor: -1234.5, moneda: null })
    expect(con).toBe('-1.234,5')
    expect(sin).toBe('-1.234,5')
  })

  it('ninguna versión lleva un nombre aparte: el lector lee el texto que se ve', () => {
    const { raiz } = dibujar({ valor: 1, moneda: 'USD' })
    expect(raiz.querySelector('[aria-label]')).toBeNull()
    expect(raiz.querySelectorAll('[data-monto] > *')).toHaveLength(2)
  })
})

describe('useMontoEnTexto', () => {
  it('con el Modo Live, el número sin moneda; sin él, con su moneda; y cambia al alternar', () => {
    const { result } = renderHook(() => ({ texto: useMontoEnTexto(), live: useLive() }), {
      wrapper: Regional,
    })
    expect(plano(result.current.texto(1234.5, { moneda: 'BOB' }))).toBe('Bs 1.234,50')
    act(() => {
      result.current.live.alternar()
    })
    expect(result.current.texto(1234.5, { moneda: 'BOB' })).toBe('1.234,50')
    expect(result.current.texto(1234.5, { decimales: 0 })).toBe('1.235')
    act(() => {
      result.current.live.alternar()
    })
    expect(plano(result.current.texto(1234.5))).toBe('USD 1.234,50')
  })
})
