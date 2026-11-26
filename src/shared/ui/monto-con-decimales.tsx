'use client'

import { redondeadaParaMostrar } from '@/shared/lib/cifra-fija'
import { Monto } from './monto'

type Props = {
  valor: number
  // Como en `<Monto>`: sin ella, la moneda base de la empresa.
  moneda?: string | undefined
  // Los «Decimales» de una celda de la fórmula: N fijos, con la cifra redondeada antes como la base (`cifra-fija.ts`). Sin ellos, `<Monto>` de siempre.
  decimales: number | undefined
}

// Un monto con los decimales de su celda, por `<Monto>` (Modo Live). Va aparte de `monto.tsx`: el redondeo de la base lo pagan sólo quienes lo muestran.
export function MontoConDecimales({ valor, moneda, decimales }: Props) {
  return (
    <Monto
      valor={decimales === undefined ? valor : redondeadaParaMostrar(valor, 'monto', decimales)}
      {...(moneda === undefined ? {} : { moneda })}
      {...(decimales === undefined ? {} : { decimales })}
    />
  )
}
