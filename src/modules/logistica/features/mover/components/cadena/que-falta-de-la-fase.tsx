'use client'

import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'
import type { NodoDeLaCadena } from '../../../../entities/mover/cadena'
import { NO_SE_LLEGA_DESDE_LA_ACTUAL, textoDePrimero } from '../../../../entities/mover/fase-vista'
import type { UnidadAbierta } from '../../../../entities/nucleo/unidad'
import { useAccionesDeQueFalta } from '../../hooks/use-acciones-de-que-falta'
import { useRequisitosDeLaFase } from '../../hooks/use-requisitos-de-la-fase'
import { RequisitosDeUnDestino } from '../requisitos-de-un-destino'
import type { RequisitosDeLaFase } from '../../actions/leer-requisitos-de-la-fase'
import type { RequisitosLeidos } from './proveedor-de-la-cadena'

type Props = {
  unidad: UnidadAbierta
  nodo: NodoDeLaCadena & { faseId: string }
  // La fase por la que tiene que pasar antes (la siguiente del camino); nula si no hay otra antes.
  primero: string | null
  // Lo ya leído por fase (del proveedor de la cadena).
  leidos: RequisitosLeidos
}

// «Qué falta» de una fase de la cadena a la que hoy no se puede mover: por cuál tiene que pasar primero y lo que esa fase le va a pedir, con lo que destraba cada falta
// (se puede adelantar). Sin «Mover». Llega con `diferido()` al primer toque de una fase así: la página en frío no la paga.
export function QueFaltaDeLaFase({ unidad, nodo, primero, leidos }: Props) {
  const { lectura, reintentar } = useRequisitosDeLaFase(
    unidad,
    { faseId: nodo.faseId, nombre: nodo.nombre },
    leidos,
  )
  return (
    <div className="grid gap-3" data-hueco="que-falta" data-estado={lectura.tipo}>
      <p className="text-(length:--text-sm) text-(--color-ink)">
        {primero ? textoDePrimero(primero) : NO_SE_LLEGA_DESDE_LA_ACTUAL}
      </p>
      {lectura.tipo === 'cargando' ? (
        <div aria-busy="true" aria-label="Cargando lo que pide esta fase" className="grid gap-2">
          <Skeleton className="h-6" />
          <Skeleton className="h-6" />
        </div>
      ) : lectura.tipo === 'error' ? (
        <div className="grid gap-2">
          <Aviso tono="peligro">
            <p>{lectura.error.mensaje}</p>
          </Aviso>
          <div>
            <Button variant="outline" onClick={reintentar}>
              Reintentar
            </Button>
          </div>
        </div>
      ) : (
        <RequisitosDeLaFaseLeida unidad={unidad} dato={lectura.dato} />
      )}
    </div>
  )
}

function RequisitosDeLaFaseLeida({
  unidad,
  dato,
}: {
  unidad: UnidadAbierta
  dato: RequisitosDeLaFase
}) {
  const acciones = useAccionesDeQueFalta(unidad, dato.acciones)
  return <RequisitosDeUnDestino requisitos={dato.requisitos} acciones={acciones} />
}
