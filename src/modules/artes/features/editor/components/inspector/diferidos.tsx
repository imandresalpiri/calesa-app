'use client'

import { diferido } from '@/shared/ui/diferido'
import { Skeleton } from '@/shared/ui/skeleton'

// La pestaña «Textos» del inspector (el texto base con `EditorConVariables` y el editor del Mensaje del portal de `leads`) se pide la primera
// vez que se abre; mientras llega, su esqueleto; sin red, el aviso en su lugar.
export const PanelDeTextosDiferido = diferido(
  () => import('../../../textos/components/panel-de-textos').then((m) => m.PanelDeTextos),
  {
    aviso: 'aqui',
    esqueleto: (
      <div className="grid gap-3 p-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-40" />
        <Skeleton className="h-48" />
      </div>
    ),
  },
)
