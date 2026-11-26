'use client'

import type { ReactNode } from 'react'
import { Button } from '../button'
import { Skeleton } from '../skeleton'

// El alto del resumen: el mismo leyendo, con error o leído, para que la tarjeta no salte al llegar lo que lee (dos líneas de texto chico).
export const ALTO_DEL_RESUMEN = 'min-h-10'

type Props = {
  titulo: string
  estado: 'leyendo' | 'fallo' | 'leido'
  alReintentar: () => void
  children: ReactNode
}

// Lo que dice una tarjeta que lee por su cuenta (Imágenes, Compras): mientras lee, dos renglones en su lugar; si falla, «No pudimos mostrar «título».» con «Reintentar» en el mismo
// alto, y las demás tarjetas siguen; leído, su resumen. El botón de adentro recibe el clic aunque la tarjeta se abra al tocarla.
export function ResumenDeLaTarjeta({ titulo, estado, alReintentar, children }: Props) {
  if (estado === 'leyendo') {
    return (
      <div
        role="status"
        aria-label={`Cargando ${titulo}`}
        className={`grid content-center gap-1.5 ${ALTO_DEL_RESUMEN}`}
      >
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    )
  }
  if (estado === 'fallo') {
    return (
      <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${ALTO_DEL_RESUMEN}`}>
        <p className="text-(length:--text-sm) text-(--color-peligro-ink)">
          {`No pudimos mostrar «${titulo}».`}
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="min-h-11 md:min-h-8"
          onClick={alReintentar}
        >
          Reintentar
        </Button>
      </div>
    )
  }
  return <div className={`grid content-start gap-0.5 ${ALTO_DEL_RESUMEN}`}>{children}</div>
}
