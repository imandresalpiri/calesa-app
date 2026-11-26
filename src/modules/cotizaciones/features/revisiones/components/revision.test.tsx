import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ContenidoDeLaRevision } from './revision'

afterEach(cleanup)

// Lo pisado en una revisión (`docs/COTIZADOR.md` › «Pisar un cálculo»): el dinero por `<Monto>` (Modo Live), nunca en un texto.
const revision = (diff: Record<string, unknown>) => ({
  id: 1,
  usuarioId: '00000000-0000-4000-8000-0000000000bb',
  creadoEn: '2026-11-04T10:00:00+00:00',
  autor: 'Ana Pérez',
  diff,
  vehiculo: null,
})
const etiquetas = new Map([
  ['transf', 'Transferencia a USA'],
  ['comision', 'Comisión'],
])
const calculos = {
  calculos: new Map([
    ['transf', 'usd'],
    ['comision', 'pct'],
  ] as const),
  decimales: new Map<string, number>(),
}
const lineaDeCambios = (
  diff: Record<string, unknown>,
  decimales: ReadonlyMap<string, number> = calculos.decimales,
) => {
  const { container } = render(
    <ContenidoDeLaRevision
      revision={revision(diff)}
      etiquetas={etiquetas}
      calculos={{ ...calculos, decimales }}
    />,
  )
  return container.querySelectorAll('p')[1]
}

describe('ContenidoDeLaRevision › un cálculo pisado o devuelto', () => {
  it('«Pisó «Transferencia a USA»: $480 → $500», con los dos montos por `<Monto>`', () => {
    const linea = lineaDeCambios({
      valores: { de: { transf: 480 }, a: { transf: 500 } },
      fuentes: { de: {}, a: { transf: 'override' } },
    })
    expect(linea?.textContent).toMatch(/^Pisó «Transferencia a USA»: .*480.* → .*500/)
    expect(linea?.querySelectorAll('[data-monto]')).toHaveLength(2)
  })

  it('un porcentaje pisado sin `<Monto>`; «Volvió al calculado «X»» sin montos', () => {
    const pct = lineaDeCambios({
      valores: { de: { comision: 0.05 }, a: { comision: 0.042 } },
      fuentes: { de: {}, a: { comision: 'override' } },
    })
    expect(pct?.textContent).toMatch(/^Pisó «Comisión»: 5\s?% → 4[.,]2\s?%$/)
    expect(pct?.querySelector('[data-monto]')).toBeNull()
    cleanup()
    const devuelto = lineaDeCambios({
      valores: { de: { transf: 500 }, a: { transf: 480 } },
      fuentes: { de: { transf: 'override' }, a: {} },
    })
    expect(devuelto?.textContent).toBe('Volvió al calculado «Transferencia a USA»')
  })

  it('lo pisado con los «Decimales» del cálculo: «Pisó «Transferencia a USA»: USD 480 → USD 500» con 0, «4,2%» con 1', () => {
    const plano = (t: string | null | undefined) => (t ?? '').replace(/[\u00a0\u202f]/g, ' ')
    const monto = lineaDeCambios(
      {
        valores: { de: { transf: 480.4 }, a: { transf: 500.5 } },
        fuentes: { de: {}, a: { transf: 'override' } },
      },
      new Map([['transf', 0]]),
    )
    const cifras = [...(monto?.querySelectorAll('[data-monto-valor]') ?? [])].map((n) =>
      plano(n.textContent),
    )
    expect(cifras).toEqual(['USD 480', 'USD 501'])
    cleanup()
    const pct = lineaDeCambios(
      {
        valores: { de: { comision: 0.05 }, a: { comision: 0.04249 } },
        fuentes: { de: {}, a: { comision: 'override' } },
      },
      new Map([['comision', 1]]),
    )
    expect(pct?.textContent).toBe('Pisó «Comisión»: 5,0% → 4,2%')
  })
})
