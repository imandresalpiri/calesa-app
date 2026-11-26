'use client'

import { Button } from '@/shared/ui/button'
import { useRegional } from '@/shared/ui/regional'
import { Skeleton } from '@/shared/ui/skeleton'
import { opcionesDeLaLectura, presentarDiff } from '../../../entities/diff'
import type { LecturaDelDiff } from '../hooks/use-diff'
import { ValorDelCambio } from './valor-del-cambio'

export const SIN_ACCESO_AL_CAMBIO = 'No tienes acceso a este cambio.'

function Esqueleto() {
  return (
    <div aria-busy="true" aria-label="Cargando el cambio" className="grid gap-2">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  )
}

// Sin red lo dice; si no, que no se pudo. Siempre con «Reintentar», sin tocar el resto de la lista.
function ErrorDelCambio({ reintentar }: { reintentar: () => void }) {
  const sinRed = typeof navigator !== 'undefined' && !navigator.onLine
  return (
    <div role="alert" className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <p className="text-(length:--text-sm) text-(--color-ink)">
        {sinRed ? 'Sin conexión. No se pudo cargar el cambio.' : 'No se pudo cargar el cambio.'}
      </p>
      <Button type="button" variant="outline" onClick={reintentar} className="min-h-11 md:min-h-9">
        Reintentar
      </Button>
    </div>
  )
}

// El detalle de un cambio (en su drawer, «Detalle del cambio»): leyendo, error con «Reintentar», sin acceso, sin campos que
// ver, o cada campo con su antes y su después.
export function CuerpoDelCambio({
  lectura,
  reintentar,
}: {
  lectura: LecturaDelDiff
  reintentar: () => void
}) {
  const { zonaHoraria } = useRegional()
  if (lectura.estado === 'leyendo') {
    return <Esqueleto />
  }
  if (lectura.estado === 'error') {
    return <ErrorDelCambio reintentar={reintentar} />
  }
  const { diff, campos } = lectura
  if (!diff.visible) {
    return (
      <p role="status" className="text-(length:--text-sm) text-(--color-ink)">
        {SIN_ACCESO_AL_CAMBIO}
      </p>
    )
  }
  const cambios = presentarDiff(diff, opcionesDeLaLectura(diff, campos))
  if (cambios.length === 0) {
    return (
      <p role="status" className="text-(length:--text-sm) text-(--color-ink-soft)">
        Este cambio no trae campos que puedas ver.
      </p>
    )
  }
  return (
    <dl className="grid gap-3">
      {cambios.map((cambio) => (
        <div key={cambio.clave} className="grid gap-1">
          <dt className="text-(length:--text-sm) font-medium [overflow-wrap:anywhere] text-(--color-ink)">
            {cambio.etiqueta}
          </dt>
          <dd className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-(length:--text-sm)">
            <span className="text-(--color-ink-soft)">Antes</span>
            <ValorDelCambio valor={cambio.antes} zona={zonaHoraria} />
            <span className="text-(--color-ink-soft)">Después</span>
            <ValorDelCambio valor={cambio.despues} zona={zonaHoraria} />
          </dd>
        </div>
      ))}
    </dl>
  )
}
