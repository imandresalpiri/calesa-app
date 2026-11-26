'use client'

import { formatearConDecimales, redondeadaParaMostrar } from '@/shared/lib/cifra-fija'
import { formatearMonto, formatearNumero, formatearPorcentaje } from '@/shared/lib/formato'
import { Monto } from '../monto'
import { useRegional } from '../regional'
import type { FormatoDeXCell } from './estado'

type Props = {
  valor: number | null
  formato: FormatoDeXCell
  moneda: string | undefined
  decimales: number | undefined
}

// Lo que dice la celda como texto plano (para un `title`), igual que `TextoDeValor`. El dinero con el Modo Live encendido es lo que dibuja `<Monto>`
// («•••»): la cifra no sale en un atributo que el CSS del modo no tapa. Con `decimales`, N fijos y redondeados como la base (`cifra-fija.ts`);
// sin ellos, lo de siempre (2 en un monto, hasta 2 en un número o un porcentaje).
export function textoPlanoDeValor(
  { valor, formato, moneda, decimales }: Props,
  regional: { locale: string; monedaBase: string },
  live: boolean,
): string {
  const { locale } = regional
  if (valor === null) {
    return 'Sin valor'
  }
  if (formato === 'monto' && live) {
    return '•••'
  }
  if (decimales !== undefined) {
    return formatearConDecimales(valor, formato, {
      decimales,
      locale,
      ...(formato === 'monto' ? { moneda: moneda ?? regional.monedaBase } : {}),
    })
  }
  switch (formato) {
    case 'monto':
      return formatearMonto(valor, { moneda: moneda ?? regional.monedaBase, locale })
    case 'porcentaje':
      return formatearPorcentaje(valor, { locale, decimales: 2 })
    case 'numero':
      return formatearNumero(valor, { locale })
  }
}

// Lo que dice una celda cuando no se edita. El dinero pasa por `<Monto>` (Modo Live); un porcentaje o un número no son dinero.
export function TextoDeValor({ valor, formato, moneda, decimales }: Props) {
  const regional = useRegional()
  if (valor === null) {
    return <>Sin valor</>
  }
  if (formato === 'monto') {
    return (
      <Monto
        valor={decimales === undefined ? valor : redondeadaParaMostrar(valor, 'monto', decimales)}
        {...(moneda === undefined ? {} : { moneda })}
        {...(decimales === undefined ? {} : { decimales })}
      />
    )
  }
  return <>{textoPlanoDeValor({ valor, formato, moneda, decimales }, regional, false)}</>
}
