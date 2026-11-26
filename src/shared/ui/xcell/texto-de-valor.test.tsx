import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { CLASE_LIVE } from '../guion-live'
import { ProveedorRegional } from '../regional'
import { textoPlanoDeValor, TextoDeValor } from './texto-de-valor'

afterEach(() => {
  cleanup()
  document.documentElement.classList.remove(CLASE_LIVE)
})

const ES = { locale: 'es-BO', monedaBase: 'USD' }
const plano = (texto: string) => texto.replace(/[  ]/g, ' ')

function dibujar(props: Parameters<typeof TextoDeValor>[0]) {
  const { container } = render(
    <ProveedorRegional locale="es-BO" monedaBase="USD" zonaHoraria="America/La_Paz">
      <TextoDeValor {...props} />
    </ProveedorRegional>,
  )
  return container
}

describe('TextoDeValor con `decimales`', () => {
  it('N fijos, con la cifra redondeada como la base', () => {
    const monto = dibujar({
      valor: 1234.5649999999998,
      formato: 'monto',
      moneda: 'USD',
      decimales: 2,
    })
    expect(plano(monto.querySelector('[data-monto-valor]')?.textContent ?? '')).toBe('USD 1.234,57')
    cleanup()
    expect(
      dibujar({ valor: 1234.5, formato: 'numero', moneda: undefined, decimales: 3 }).textContent,
    ).toBe('1.234,500')
    cleanup()
    expect(
      dibujar({ valor: 0.14945, formato: 'porcentaje', moneda: undefined, decimales: 1 })
        .textContent,
    ).toBe('14,9%')
  })

  it('el dinero sigue por `<Monto>` (Modo Live: «•••»), y el texto plano no dice la cifra', () => {
    const monto = dibujar({ valor: 1234.5678, formato: 'monto', moneda: 'USD', decimales: 0 })
    expect(plano(monto.querySelector('[data-monto-valor]')?.textContent ?? '')).toBe('USD 1.235')
    expect(monto.querySelector('[data-monto-oculto]')?.textContent).toBe('•••')
    expect(
      textoPlanoDeValor(
        { valor: 1234.5678, formato: 'monto', moneda: 'USD', decimales: 0 },
        ES,
        true,
      ),
    ).toBe('•••')
  })

  it('sin `decimales`, lo de siempre: 2 en un monto, hasta 2 en un número y en un porcentaje', () => {
    const casos = [
      [1234.5, 'monto', 'USD 1.234,50'],
      [1234.5, 'numero', '1.234,5'],
      [1234.567, 'numero', '1.234,57'],
      [0.14945, 'porcentaje', '14,95%'],
      [0.15, 'porcentaje', '15%'],
    ] as const
    for (const [valor, formato, esperado] of casos) {
      const texto = textoPlanoDeValor(
        { valor, formato, moneda: 'USD', decimales: undefined },
        ES,
        false,
      )
      expect(plano(texto)).toBe(esperado)
    }
  })

  it('sin valor dice «Sin valor»', () => {
    expect(
      dibujar({ valor: null, formato: 'monto', moneda: 'USD', decimales: 0 }).textContent,
    ).toBe('Sin valor')
  })
})
