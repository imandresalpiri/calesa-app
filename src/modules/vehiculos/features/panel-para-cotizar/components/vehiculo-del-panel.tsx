'use client'

import { fechaRelativa } from '@/shared/lib/fechas'
import { Badge } from '@/shared/ui/badge'
import { Monto } from '@/shared/ui/monto'
import { useRegional } from '@/shared/ui/regional'
import type { VehiculoDelPanel as Vehiculo } from '../../../entities/panel-para-cotizar'
import { situacionDelAviso, subastaCerrada } from '../../../entities/subasta-cerrada'
import { Miniatura } from '../../listado/components/miniatura'
import { FechaDeSubasta } from '../../subasta/components/fecha-de-subasta'
import { VerLaFicha } from './ver-la-ficha'

type Props = {
  vehiculo: Vehiculo
  seleccionado: boolean
  // Contra qué instante se decide si su subasta ya cerró.
  ahora: Date
  alElegir: (id: string) => void
}

// Un vehículo de la lista del panel: un botón que lo elige y, al medio a la derecha, «Ver <título> en Vehículos» (hermano del botón: abre la ficha en otra pestaña). El título se corta con «…»; el lote, el precio, cuándo cierra su subasta y
// cuándo se cotizó, si los tiene; y «Subasta cerrada» (con su situación) si la subasta ya pasó.
export function VehiculoDelPanel({ vehiculo, seleccionado, ahora, alElegir }: Props) {
  const { zonaHoraria } = useRegional()
  const cerrada = subastaCerrada(vehiculo, ahora)
  const situacion = situacionDelAviso(vehiculo.situacion)
  return (
    <li className="relative min-w-0">
      <button
        type="button"
        aria-current={seleccionado ? 'true' : undefined}
        onClick={() => {
          alElegir(vehiculo.id)
        }}
        className="flex min-h-11 w-full min-w-0 items-start gap-3 rounded-(--radius-md) p-2 pr-14 text-left hover:bg-(--color-surface-3) aria-[current=true]:bg-(--color-surface-3)"
      >
        <Miniatura ruta={vehiculo.portadaRuta} className="w-16" />
        <span className="grid min-w-0 flex-1 gap-0.5 text-(length:--text-xs) text-(--color-ink-soft)">
          <span className="truncate text-(length:--text-sm) font-medium text-(--color-ink)">
            {vehiculo.titulo}
          </span>
          {vehiculo.lote ? <span>Lote {vehiculo.lote}</span> : null}
          {vehiculo.precio === null ? null : (
            <Monto valor={vehiculo.precio} className="text-(--color-ink)" />
          )}
          {vehiculo.cierreSubastaEn ? (
            <span>
              {cerrada ? 'Cerró' : 'Cierra'} <FechaDeSubasta iso={vehiculo.cierreSubastaEn} />
            </span>
          ) : null}
          {vehiculo.cotizadoEn ? (
            <span>Cotizado {fechaRelativa(vehiculo.cotizadoEn, { zona: zonaHoraria })}</span>
          ) : null}
          {cerrada ? (
            <span className="font-medium text-(--color-aviso-ink)">
              Subasta cerrada{situacion ? ` · ${situacion}` : ''}
            </span>
          ) : null}
          {seleccionado ? <Badge className="w-fit">Seleccionado</Badge> : null}
        </span>
      </button>
      <VerLaFicha
        id={vehiculo.id}
        titulo={vehiculo.titulo}
        className="absolute top-1/2 right-1 -translate-y-1/2"
      />
    </li>
  )
}
