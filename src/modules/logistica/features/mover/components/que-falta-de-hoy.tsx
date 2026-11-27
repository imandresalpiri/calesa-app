'use client'

import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'
import type { UnidadAbierta } from '../../../entities/nucleo/unidad'
import { useBorradorDeMover } from '../hooks/use-borrador-de-mover'
import { useModoGanada } from '../hooks/use-modo-ganada'
import type { LecturaParaMover, useParaMover } from '../hooks/use-para-mover'
import { CuerpoDeQueFalta } from './cuerpo-de-que-falta'

type ParaMover = ReturnType<typeof useParaMover>

/** Lo de hoy: los destinos de la fase actual (o, con `soloDestino`, sólo ese y abierto: la fase directa que se mira en la cadena). */
export function QueFaltaDeHoy({
  unidad,
  paraMover,
  soloDestino = null,
}: {
  unidad: UnidadAbierta
  paraMover: ParaMover
  soloDestino?: string | null
}) {
  const { lectura, actualizando, reintentar, releer } = paraMover
  const modoGanada = useModoGanada()
  const borrador = useBorradorDeMover(
    modoGanada.activo && unidad.tipo === 'vehiculo' ? modoGanada : null,
  )
  if (lectura.tipo !== 'listo')
    return <EstadoDeLaLectura lectura={lectura} reintentar={reintentar} />
  return (
    <CuerpoDeQueFalta
      unidad={unidad}
      dato={lectura.dato}
      actualizando={actualizando}
      releer={releer}
      borrador={borrador}
      modoGanada={modoGanada}
      soloDestino={soloDestino}
    />
  )
}

function EstadoDeLaLectura({
  lectura,
  reintentar,
}: {
  lectura: Exclude<LecturaParaMover, { tipo: 'listo' }>
  reintentar: () => void
}) {
  if (lectura.tipo === 'cargando') {
    return (
      <div aria-busy="true" aria-label="Cargando lo que falta" className="grid gap-2">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
    )
  }
  return (
    <div className="grid gap-2">
      <Aviso tono={lectura.error.codigo === 'sin_permiso' ? 'info' : 'peligro'}>
        <p>{lectura.error.mensaje}</p>
      </Aviso>
      {lectura.error.codigo === 'sin_permiso' ? null : (
        <div>
          <Button variant="outline" onClick={reintentar}>
            Reintentar
          </Button>
        </div>
      )}
    </div>
  )
}
