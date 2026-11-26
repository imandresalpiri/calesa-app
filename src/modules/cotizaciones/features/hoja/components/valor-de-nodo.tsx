'use client'

import { formatearConDecimales } from '@/shared/lib/cifra-fija'
import { formatearNumero, formatearPorcentaje } from '@/shared/lib/formato'
import { MontoConDecimales } from '@/shared/ui/monto-con-decimales'
import { useRegional } from '@/shared/ui/regional'
import { monedaDeFormato } from '../../../entities/binding'
import type { Formato } from '../../../entities/nodos'

type Props = {
  valor: number | null
  formato: Formato
  // Los «Decimales» del nodo (glosario); sin ellos, «Automático»: lo de siempre.
  decimales?: number | undefined
}

// El valor de un nodo que la hoja dibuja sin editarlo (un subtotal, lo que suma la tarjeta, lo pisado): el dinero por `<Monto>` (Modo Live), lo demás con
// `formato.ts`. Sin valor, un guion que el lector de pantalla dice.
export function ValorDeNodo({ valor, formato, decimales }: Props) {
  const { locale } = useRegional()
  if (valor === null) {
    return <span aria-label="Sin valor">—</span>
  }
  if (formato === 'usd' || formato === 'moneda') {
    return (
      <MontoConDecimales valor={valor} moneda={monedaDeFormato(formato)} decimales={decimales} />
    )
  }
  const tipo = formato === 'pct' ? 'porcentaje' : 'numero'
  return (
    <span className="tabular-nums">
      {decimales !== undefined
        ? formatearConDecimales(valor, tipo, { decimales, locale })
        : tipo === 'porcentaje'
          ? formatearPorcentaje(valor, { locale })
          : formatearNumero(valor, { locale })}
    </span>
  )
}
