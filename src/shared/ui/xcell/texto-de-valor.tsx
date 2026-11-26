'use client'

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
// («•••»): la cifra no sale en un atributo que el CSS del modo no tapa.
export function textoPlanoDeValor(
  { valor, formato, moneda, decimales }: Props,
  regional: { locale: string; monedaBase: string },
  live: boolean,
): string {
  const { locale } = regional
  if (valor === null) {
    return 'Sin valor'
  }
  switch (formato) {
    case 'monto':
      return live
        ? '•••'
        : formatearMonto(valor, { moneda: moneda ?? regional.monedaBase, locale, decimales })
    case 'porcentaje':
      return formatearPorcentaje(valor, { locale, decimales: decimales ?? 2 })
    case 'numero':
      return formatearNumero(valor, { locale, ...(decimales === undefined ? {} : { decimales }) })
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
        valor={valor}
        {...(moneda === undefined ? {} : { moneda })}
        {...(decimales === undefined ? {} : { decimales })}
      />
    )
  }
  return <>{textoPlanoDeValor({ valor, formato, moneda, decimales }, regional, false)}</>
}
