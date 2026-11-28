'use client'

import { diferido } from '@/shared/ui/diferido'
import { Skeleton } from '@/shared/ui/skeleton'

// El cuerpo del popover «Vehículo de ejemplo» se pide la primera vez que se abre: mientras llega, su esqueleto en el mismo alto; sin red, el
// aviso adentro del popover.
export const PanelDelEjemploDiferido = diferido(
  () => import('../ejemplo').then((m) => m.PanelDelEjemplo),
  {
    aviso: 'aqui',
    esqueleto: (
      <div className="grid h-full grid-rows-[auto_minmax(0,1fr)_auto] gap-2 p-3">
        <Skeleton className="h-13" />
        <Skeleton className="h-full" />
        <Skeleton className="h-40" />
      </div>
    ),
  },
)
