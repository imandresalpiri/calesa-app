'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { declaracionDeAduana } from '@/shared/lib/rutas'
import { Button } from '@/shared/ui/button'
import { CLASES_DE_VISTO, useVistoDeLista } from '@/shared/ui/lista'
import { rutaDeLaUnidad } from '../../../entities/nucleo/enlaces'
import type { VehiculoDelEmbarque } from '../../../entities/transporte/embarque'
import { LE_FALTA_ALGO, SIN_DECLARACION } from '../../../entities/transporte/textos'
import { EnlaceALaUnidad } from '../../nucleo/components/enlace-a-la-unidad'

type Props = {
  v: VehiculoDelEmbarque
  origenId: string
  // Sin permiso de editar el transporte no llega: la fila no ofrece «Quitar».
  quitar?: { etiqueta: string; enCurso: boolean; alQuitar: () => void }
}

const ENLACE =
  'inline-flex min-h-11 items-center underline-offset-2 hover:underline focus-visible:shadow-(--shadow-focus) outline-none rounded-(--radius-input) md:min-h-0'

// Un vehículo del embarque o del contenedor: su nombre enlazado a su página de logística, su fase, su declaración aduanera (o «Sin declaración») y, si le falta algo para su
// fase siguiente, «Le falta algo» enlazado a su «Qué falta». Una sola columna que se parte al 200 %; «Quitar» con su objetivo de 44 px.
export function FilaDelVehiculo({ v, origenId, quitar }: Props) {
  const visto = useVistoDeLista(v.vehiculoId)
  return (
    <li
      data-visto={visto ?? undefined}
      data-vehiculo={v.vehiculoId}
      className={`flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 border-b border-(--color-line) py-2 last:border-b-0 ${CLASES_DE_VISTO}`}
    >
      <div className="grid min-w-0 flex-1 basis-60 gap-0.5">
        <EnlaceALaUnidad id={v.vehiculoId} nombre={v.titulo} />
        <p className="flex flex-wrap gap-x-3 text-(length:--text-sm) text-(--color-ink-soft)">
          <span>{v.fase ?? 'Sin fase'}</span>
          {v.vin === null ? null : <span className="[overflow-wrap:anywhere]">VIN {v.vin}</span>}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-(length:--text-sm)">
        {v.declaracion === null ? (
          <span className="text-(--color-ink-soft)">{SIN_DECLARACION}</span>
        ) : (
          <Link
            href={declaracionDeAduana(v.declaracion.id, origenId) as Route}
            prefetch={false}
            className={ENLACE}
          >
            Declaración {v.declaracion.numero}
          </Link>
        )}
        {v.falta ? (
          <Link
            href={rutaDeLaUnidad(v.vehiculoId) as Route}
            prefetch={false}
            className={`${ENLACE} font-medium text-(--color-aviso-ink)`}
          >
            {LE_FALTA_ALGO}
          </Link>
        ) : null}
        {quitar ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="min-h-11 md:min-h-8"
            disabled={quitar.enCurso}
            aria-label={`${quitar.etiqueta}: ${v.titulo}`}
            onClick={quitar.alQuitar}
          >
            {quitar.enCurso ? 'Quitando…' : 'Quitar'}
          </Button>
        ) : null}
      </div>
    </li>
  )
}
