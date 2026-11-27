'use client'

import { Badge } from '@/shared/ui/badge'
import type { DeclaracionLeida } from '../../../entities/aduana/declaracion'
import { TituloYDondeViaja } from './donde-viaja'

// Los vehículos de la declaración, con dónde viaja cada uno (contenedor y embarque) y su tributo dicho en texto («Tiene el tributo» / «Falta el tributo»); sin ningún monto.
export function VehiculosDelResumen({ declaracion }: { declaracion: DeclaracionLeida }) {
  return (
    <section aria-labelledby="vehiculos-de-la-declaracion" className="grid min-w-0 gap-2">
      <h3
        id="vehiculos-de-la-declaracion"
        className="text-(length:--text-base) font-medium text-(--color-ink)"
      >
        Vehículos de la declaración
      </h3>
      {declaracion.vehiculos.length === 0 ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          {declaracion.hayOcultos ? 'No ves ninguno de sus vehículos.' : 'Sin vehículos.'}
        </p>
      ) : (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
          {declaracion.vehiculos.map((vehiculo) => (
            <li
              key={vehiculo.vehiculoId}
              className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1 rounded-(--radius-card) border border-(--color-line) px-3 py-2"
            >
              <TituloYDondeViaja vehiculo={vehiculo} />
              <span className="flex flex-wrap items-center gap-2 text-(length:--text-sm) text-(--color-ink-soft)">
                {vehiculo.fase ? <span>{vehiculo.fase}</span> : null}
                <Badge variant={vehiculo.tributo ? 'secondary' : 'outline'}>
                  {vehiculo.tributo ? 'Tiene el tributo' : 'Falta el tributo'}
                </Badge>
              </span>
            </li>
          ))}
        </ul>
      )}
      {declaracion.hayMas ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Hay más vehículos de los que se muestran.
        </p>
      ) : null}
      {declaracion.hayOcultos && declaracion.vehiculos.length > 0 ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">Hay vehículos que no ves.</p>
      ) : null}
    </section>
  )
}
