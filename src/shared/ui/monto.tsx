'use client'

import { cn } from 'cn'
import { formatearMonto, formatearMontoSinMoneda, formatearNumero } from '@/shared/lib/formato'
import { useRegional } from './regional'

type Props = {
  valor: number
  // Código ISO. Sin él, la moneda base de la empresa. `null`: la moneda no se conoce (un cambio viejo de la actividad): sólo el número,
  // sin inventar ninguna, con el Modo Live y sin él.
  moneda?: string | null
  decimales?: number
  className?: string
}

// Único lugar donde se imprime dinero. Siempre van las dos versiones al DOM y el CSS elige según la clase del Modo Live en <html> (la
// que conmuta `useLive()`): así no hay un instante, antes de hidratar, en que se vea el símbolo. Con el modo encendido se ve (y se lee)
// el número con los decimales y separadores de su moneda, sin su símbolo ni su código; la otra versión sale de la vista y del árbol de
// accesibilidad. Un monto que no va en el DOM (un `title`, un `aria-label`, un aviso) sale de `useMontoEnTexto()`.
export function Monto({ valor, moneda, decimales, className }: Props) {
  const { locale, monedaBase } = useRegional()
  const conMoneda =
    moneda === null
      ? formatearNumero(valor, { locale, decimales })
      : formatearMonto(valor, { moneda: moneda ?? monedaBase, locale, decimales })
  const sinMoneda =
    moneda === null
      ? conMoneda
      : formatearMontoSinMoneda(valor, { moneda: moneda ?? monedaBase, locale, decimales })

  return (
    <span data-monto className={cn('tabular-nums', className)}>
      <span data-monto-valor>{conMoneda}</span>
      <span data-monto-sin-moneda>{sinMoneda}</span>
    </span>
  )
}
