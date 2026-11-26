'use client'

import { formatearFecha } from '@/shared/lib/fechas'
import { formatearNumero, formatearPorcentaje } from '@/shared/lib/formato'
import { Monto } from '@/shared/ui/monto'
import { useRegional } from '@/shared/ui/regional'
import type { CotizacionLeida } from '../../../entities/cotizador/hoja-de-lectura'

// «Configuración con que se calculó» (8.12-3, D37): el snapshot congelado de la cotización, o el aviso de que no tiene uno válido (las viejas sin snapshot v1
// quedaron anuladas, D15: a ésas no se les pide anular). Va dentro de «Condiciones», así que su rótulo es un texto y no un título: una sola sección por bloque.
export function ConfiguracionUsada({ cotizacion }: { cotizacion: CotizacionLeida }) {
  const { locale, zonaHoraria } = useRegional()
  if (!cotizacion.snapshot.ok) {
    return (
      <p role="status" className="text-(length:--text-sm) text-(--color-ink-soft)">
        {cotizacion.estado === 'borrador'
          ? 'Esta cotización no tiene una configuración válida: anúlala y crea otra.'
          : 'Esta cotización no tiene una configuración válida.'}
      </p>
    )
  }
  const { config } = cotizacion.snapshot.snapshot
  return (
    <div className="grid gap-1">
      <p className="text-(length:--text-sm) font-medium">Configuración con que se calculó</p>
      <dl className="grid grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] gap-x-6 gap-y-2 text-(length:--text-sm)">
        <div className="flex min-w-0 flex-col">
          <dt className="text-(length:--text-xs) text-(--color-ink-faint)">Factor importado</dt>
          <dd>{formatearNumero(Number(config.factor_importado), { locale, decimales: 4 })}</dd>
        </div>
        <div className="flex min-w-0 flex-col">
          <dt className="text-(length:--text-xs) text-(--color-ink-faint)">Recargo local</dt>
          <dd>{formatearPorcentaje(Number(config.recargo_local), { locale, decimales: 2 })}</dd>
        </div>
        <div className="flex min-w-0 flex-col">
          <dt className="text-(length:--text-xs) text-(--color-ink-faint)">Redondeo</dt>
          <dd>
            <Monto valor={Number(config.redondeo)} moneda={cotizacion.moneda} />
          </dd>
        </div>
        <div className="flex min-w-0 flex-col">
          <dt className="text-(length:--text-xs) text-(--color-ink-faint)">Vigente desde</dt>
          <dd>{formatearFecha(config.vigente_desde, { zona: zonaHoraria })}</dd>
        </div>
      </dl>
    </div>
  )
}
