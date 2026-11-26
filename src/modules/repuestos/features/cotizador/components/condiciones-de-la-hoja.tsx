'use client'

import type { ReactNode } from 'react'
import type { CotizacionLeida } from '../../../entities/cotizador/hoja-de-lectura'
import { ConfiguracionUsada } from './configuracion-usada'

type Props = { cotizacion: CotizacionLeida; children: ReactNode }

// «Condiciones», el último bloque de las dos hojas y su único título: las notas de la cotización (`children`: el campo en la borrador, el texto en las
// demás) y la configuración con que se calculó. Una cotización de repuestos no guarda otras condiciones.
export function CondicionesDeLaHoja({ cotizacion, children }: Props) {
  return (
    <section
      aria-labelledby="condiciones"
      className="grid gap-4 border-t border-(--color-line) pt-4"
    >
      <h2 id="condiciones" className="text-(length:--text-lg) font-semibold">
        Condiciones
      </h2>
      {children}
      <ConfiguracionUsada cotizacion={cotizacion} />
    </section>
  )
}
